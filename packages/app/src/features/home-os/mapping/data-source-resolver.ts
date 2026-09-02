import { HOME_OS_ROLES, type SemanticRole } from '../core/semantic-roles';
import type {
  DataSourceCandidate,
  MetricResolutionReasonCode,
  MetricResolutionState,
  ResolvedSemanticEntity,
} from '../core/types';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const append = <T>(index: Map<string, T[]>, key: string, value: T) => {
  if (!key) return;
  index.set(key, [...(index.get(key) ?? []), value]);
};

export interface HomeOsEntityIndexes {
  entitiesByDomain: Map<string, ResolvedSemanticEntity[]>;
  entitiesByDevice: Map<string, ResolvedSemanticEntity[]>;
  entitiesByIntegration: Map<string, ResolvedSemanticEntity[]>;
  entitiesByArea: Map<string, ResolvedSemanticEntity[]>;
  entitiesByDeviceClass: Map<string, ResolvedSemanticEntity[]>;
  entitiesByUnit: Map<string, ResolvedSemanticEntity[]>;
  entitiesBySemanticRole: Map<string, ResolvedSemanticEntity[]>;
}

export function buildDataSourceIndexes(
  entities: readonly ResolvedSemanticEntity[]
): HomeOsEntityIndexes {
  const indexes: HomeOsEntityIndexes = {
    entitiesByDomain: new Map(),
    entitiesByDevice: new Map(),
    entitiesByIntegration: new Map(),
    entitiesByArea: new Map(),
    entitiesByDeviceClass: new Map(),
    entitiesByUnit: new Map(),
    entitiesBySemanticRole: new Map(),
  };
  for (const item of entities) {
    const attributes = item.entity.attributes;
    append(indexes.entitiesByDomain, item.entity.externalId.split('.')[0] ?? '', item);
    append(indexes.entitiesByDevice, readString(attributes.deviceId ?? attributes.device_id), item);
    append(
      indexes.entitiesByIntegration,
      readString(attributes.integration ?? attributes.platform).toLowerCase(),
      item
    );
    append(
      indexes.entitiesByArea,
      readString(attributes.areaId ?? attributes.area_id ?? item.room),
      item
    );
    append(
      indexes.entitiesByDeviceClass,
      readString(attributes.deviceClass ?? attributes.device_class).toLowerCase(),
      item
    );
    append(
      indexes.entitiesByUnit,
      readString(attributes.unit ?? attributes.unit_of_measurement).toLowerCase(),
      item
    );
    for (const role of item.roles) append(indexes.entitiesBySemanticRole, role, item);
  }
  return indexes;
}

const candidateFromEntity = (
  item: ResolvedSemanticEntity,
  role: SemanticRole
): DataSourceCandidate | undefined => {
  const semanticCandidate = item.candidates.find((candidate) => candidate.role === role);
  if (!semanticCandidate && !item.roles.includes(role)) return undefined;
  const attributes = item.entity.attributes;
  return {
    sourceType:
      item.source === 'manual'
        ? 'manual'
        : item.reviewDisposition === 'mapped'
          ? 'semantic_mapping'
          : 'ha_entity',
    sourceId: item.entity.externalId,
    role,
    confidence: item.source === 'manual' ? 1 : (semanticCandidate?.confidence ?? item.confidence),
    deviceId: readString(attributes.deviceId ?? attributes.device_id) || undefined,
    integration:
      readString(attributes.integration ?? attributes.platform).toLowerCase() || undefined,
    areaId: readString(attributes.areaId ?? attributes.area_id ?? item.room) || undefined,
    reasons:
      item.source === 'manual' ? ['manual override'] : (semanticCandidate?.reasons ?? item.reasons),
  };
};

export interface DataSourceResolution {
  role: SemanticRole;
  state: MetricResolutionState;
  reasonCode: MetricResolutionReasonCode;
  selected?: DataSourceCandidate;
  candidates: DataSourceCandidate[];
}

export class HomeOsDataSourceResolver {
  readonly indexes: HomeOsEntityIndexes;

  constructor(
    private readonly entities: readonly ResolvedSemanticEntity[],
    private readonly providerCandidates: readonly DataSourceCandidate[] = []
  ) {
    this.indexes = buildDataSourceIndexes(entities);
  }

  candidatesForRole(role: SemanticRole) {
    const provider = this.providerCandidates.filter((candidate) => candidate.role === role);
    const entities = this.entities
      .filter((item) => !item.ignored && item.displayMode !== 'hidden')
      .map((item) => candidateFromEntity(item, role))
      .filter((candidate): candidate is DataSourceCandidate => Boolean(candidate));
    const precedence: Record<DataSourceCandidate['sourceType'], number> = {
      manual: 4,
      semantic_mapping: 3,
      provider: 2,
      ha_entity: 1,
    };
    return [...provider, ...entities].sort(
      (left, right) =>
        precedence[right.sourceType] - precedence[left.sourceType] ||
        right.confidence - left.confidence
    );
  }

  resolve(role: SemanticRole): DataSourceResolution {
    const candidates = this.candidatesForRole(role);
    const selected =
      candidates.find((candidate) => candidate.sourceType === 'manual') ?? candidates[0];
    if (!selected)
      return { role, state: 'capability_absent', reasonCode: 'no_candidate_found', candidates };
    if (
      candidates.length > 1 &&
      !candidates.some((candidate) => candidate.sourceType === 'manual') &&
      candidates[0]?.sourceType === candidates[1]?.sourceType &&
      (candidates[0]?.confidence ?? 0) - (candidates[1]?.confidence ?? 0) < 0.1
    ) {
      return { role, state: 'ambiguous', reasonCode: 'candidate_ambiguous', candidates };
    }
    return {
      role,
      state:
        selected.sourceType === 'provider' ||
        selected.sourceType === 'semantic_mapping' ||
        selected.sourceType === 'manual'
          ? 'available'
          : 'unmapped',
      reasonCode:
        selected.sourceType === 'provider'
          ? 'provider_available'
          : selected.sourceType === 'ha_entity'
            ? 'candidate_unmapped'
            : 'mapped_available',
      selected,
      candidates,
    };
  }
}

export interface WeatherSourceLike {
  id: string;
  condition?: string;
  temperature?: number;
  temperatureUnit?: string;
  feelsLikeTemperature?: number;
  feelsLikeTemperatureUnit?: string;
  humidity?: number;
  pressure?: number;
  pressureUnit?: string;
  windSpeed?: number;
  windSpeedUnit?: string;
  windDirection?: string;
  visibility?: number;
  dewPoint?: number;
  forecast?: readonly unknown[];
}

export interface ResolvedWeatherSource {
  sourceType: 'provider' | 'ha_weather';
  id: string;
  reasonCode: 'provider_available' | 'provider_unavailable' | 'mapped_available';
  current: Omit<WeatherSourceLike, 'id' | 'forecast'>;
  forecast?: readonly unknown[];
}

export function resolveWeatherSource(
  providerWeather: readonly WeatherSourceLike[],
  entities: readonly ResolvedSemanticEntity[]
): ResolvedWeatherSource | undefined {
  const provider = providerWeather[0];
  if (provider) {
    return {
      sourceType: 'provider',
      id: provider.id,
      reasonCode:
        provider.condition || provider.temperature !== undefined
          ? 'provider_available'
          : 'provider_unavailable',
      current: {
        condition: provider.condition,
        temperature: provider.temperature,
        temperatureUnit: provider.temperatureUnit,
        feelsLikeTemperature: provider.feelsLikeTemperature,
        feelsLikeTemperatureUnit: provider.feelsLikeTemperatureUnit,
        humidity: provider.humidity,
        pressure: provider.pressure,
        pressureUnit: provider.pressureUnit,
        windSpeed: provider.windSpeed,
        windSpeedUnit: provider.windSpeedUnit,
        windDirection: provider.windDirection,
        visibility: provider.visibility,
        dewPoint: provider.dewPoint,
      },
      forecast: provider.forecast,
    };
  }
  const weather = entities.find(
    (item) => !item.ignored && item.entity.externalId.startsWith('weather.')
  )?.entity;
  if (!weather) return undefined;
  const number = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  return {
    sourceType: 'ha_weather',
    id: weather.externalId,
    reasonCode: 'mapped_available',
    current: {
      condition: typeof weather.primaryState === 'string' ? weather.primaryState : undefined,
      temperature: number(weather.attributes.temperature ?? weather.attributes.native_temperature),
      temperatureUnit:
        readString(weather.attributes.temperature_unit ?? weather.attributes.unit_of_measurement) ||
        undefined,
      feelsLikeTemperature: number(
        weather.attributes.apparent_temperature ?? weather.attributes.native_apparent_temperature
      ),
      humidity: number(weather.attributes.humidity),
      pressure: number(weather.attributes.pressure ?? weather.attributes.native_pressure),
      pressureUnit: readString(weather.attributes.pressure_unit) || undefined,
      windSpeed: number(weather.attributes.wind_speed ?? weather.attributes.native_wind_speed),
      windSpeedUnit: readString(weather.attributes.wind_speed_unit) || undefined,
      windDirection: readString(weather.attributes.wind_bearing) || undefined,
      visibility: number(weather.attributes.visibility),
      dewPoint: number(weather.attributes.dew_point),
    },
    forecast: Array.isArray(weather.attributes.forecast) ? weather.attributes.forecast : undefined,
  };
}

export const AIR_QUALITY_ROLES = [
  HOME_OS_ROLES.environmentAirQuality,
  HOME_OS_ROLES.environmentPm25,
  HOME_OS_ROLES.environmentPm10,
  HOME_OS_ROLES.environmentCo2,
  HOME_OS_ROLES.environmentVoc,
  HOME_OS_ROLES.environmentTvoc,
  HOME_OS_ROLES.environmentHcho,
] as const;

export function resolveAirQualitySources(entities: readonly ResolvedSemanticEntity[]) {
  const metrics = entities.filter(
    (item) =>
      !item.ignored &&
      item.displayMode !== 'hidden' &&
      item.roles.some((role) =>
        AIR_QUALITY_ROLES.includes(role as (typeof AIR_QUALITY_ROLES)[number])
      )
  );
  if (!metrics.length) {
    return {
      state: 'capability_absent' as const,
      reasonCode: 'no_candidate_found' as const,
      metrics,
    };
  }
  if (metrics.every((item) => item.entity.availability !== 'available')) {
    return { state: 'unavailable' as const, reasonCode: 'mapped_unavailable' as const, metrics };
  }
  return { state: 'available' as const, reasonCode: 'mapped_available' as const, metrics };
}
