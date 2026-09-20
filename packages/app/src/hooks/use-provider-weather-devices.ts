import { SUN_ENTITY_ID } from '@navet/app/constants';
import { mapWeatherDevice } from '@navet/app/hooks/device-mappers';
import { useI18n } from '@navet/app/i18n';
import type { PlatformWeatherDevice } from '@navet/app/platform/provider-feature-models';
import { weatherForecastStore } from '@navet/app/services/weather-forecast-store';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useIntegrationStore } from './use-integration-store';
import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshotsByPrefix,
} from './use-provider-entity';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_WEATHER_DEVICES: PlatformWeatherDevice[] = [];
const WEATHER_ENTITY_PREFIXES = ['sun.', 'weather.'] as const;

const EMPTY_FORECAST_SNAPSHOT = {
  data: [],
  loading: false,
  error: null,
  listeners: new Set<() => void>(),
  generation: 0,
} as ReturnType<typeof weatherForecastStore.getSnapshot>;

function useForecastSnapshot(
  entityId: string | null,
  type: 'daily' | 'hourly' | 'twice_daily',
  enabled: boolean
) {
  const subscribe = useCallback(
    (listener: () => void) =>
      enabled && entityId
        ? weatherForecastStore.subscribe(entityId, type, listener)
        : () => undefined,
    [enabled, entityId, type]
  );
  const getSnapshot = useCallback(
    () => (enabled && entityId ? weatherForecastStore.getSnapshot(entityId, type) : EMPTY_FORECAST_SNAPSHOT),
    [enabled, entityId, type]
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_FORECAST_SNAPSHOT);
}

function resolveEntityName(
  entityId: string,
  entity: { attributes?: Record<string, unknown> },
  entityName?: string | null
) {
  if (typeof entityName === 'string' && entityName.trim().length > 0) {
    return entityName.trim();
  }

  return (
    (typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name) ||
    entityId ||
    'Unknown'
  );
}

function resolveEntityRoom(
  _scopedEntityId: string,
  entity: { attributes?: Record<string, unknown> },
  entityRoom?: string
) {
  return (
    entityRoom ||
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}

export function useProviderWeatherDevices(
  providerId?: IntegrationProviderId,
  options?: { enabled?: boolean }
): PlatformWeatherDevice[] {
  const enabled = options?.enabled ?? true;
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const entitiesHydrated = useIntegrationStore(
    (state) =>
      (state.providerRuntime[resolvedProviderId] ?? state.providerRuntime[state.currentProviderId])
        .entitiesHydrated
  );
  const supportsWeather = useProviderFeature('weather', resolvedProviderId) && enabled;
  const entities = useProviderEntitySnapshotsByPrefix(WEATHER_ENTITY_PREFIXES, {
    providerId: resolvedProviderId,
    enabled: supportsWeather,
  });
  const entityRegistry = useProviderEntityRegistryEntries({
    providerId: resolvedProviderId,
    enabled: supportsWeather,
  });
  const { locale, t } = useI18n();
  const weatherForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const primaryWeatherEntityId = useMemo(() => {
    if (!supportsWeather || !entities) {
      return null;
    }

    return Object.keys(entities).find((entityId) => entityId.startsWith('weather.')) ?? null;
  }, [entities, supportsWeather]);

  const entityRegistryMap = useMemo(
    () => new Map(entityRegistry.map((entry) => [entry.entityId, entry])),
    [entityRegistry]
  );
  const forecastEntity = primaryWeatherEntityId ? entities?.[primaryWeatherEntityId] : undefined;
  const supportedFeatures = forecastEntity?.attributes?.supported_features;
  const forecastTypes = (['daily', 'hourly', 'twice_daily'] as const).filter((type) => {
    const flag = type === 'daily' ? 1 : type === 'hourly' ? 2 : 4;
    return typeof supportedFeatures === 'number' && (supportedFeatures & flag) !== 0;
  });
  const scopedPrimaryId = primaryWeatherEntityId
    ? createProviderScopedId(resolvedProviderId, primaryWeatherEntityId)
    : null;
  const dailySnapshot = useForecastSnapshot(
    scopedPrimaryId,
    'daily',
    supportsWeather && forecastTypes.includes('daily')
  );
  const hourlySnapshot = useForecastSnapshot(
    scopedPrimaryId,
    'hourly',
    supportsWeather && forecastTypes.includes('hourly')
  );
  const twiceDailySnapshot = useForecastSnapshot(
    scopedPrimaryId,
    'twice_daily',
    supportsWeather && forecastTypes.includes('twice_daily')
  );
  const lastResolvedDevicesRef = useRef<PlatformWeatherDevice[]>(EMPTY_WEATHER_DEVICES);

  const resolvedDevices = useMemo(() => {
    if (!entities || !primaryWeatherEntityId) {
      return EMPTY_WEATHER_DEVICES;
    }

    const weatherEntity = entities[primaryWeatherEntityId];
    if (!weatherEntity) {
      return EMPTY_WEATHER_DEVICES;
    }

    const scopedEntityId = createProviderScopedId(resolvedProviderId, primaryWeatherEntityId);
    return [
      mapWeatherDevice(
        scopedEntityId,
        weatherEntity,
        resolveEntityName(
          primaryWeatherEntityId,
          weatherEntity,
          entityRegistryMap.get(primaryWeatherEntityId)?.name
        ),
        resolveEntityRoom(scopedEntityId, weatherEntity, undefined),
        {
          sunEntity: entities[SUN_ENTITY_ID],
          config: null,
          weatherForecastMode,
          storedForecasts: {
            daily: dailySnapshot.data,
            hourly: hourlySnapshot.data,
            twice_daily: twiceDailySnapshot.data,
          },
          locale,
          t,
          use24HourTime,
        }
      ),
    ];
  }, [
    resolvedProviderId,
    dailySnapshot.data,
    hourlySnapshot.data,
    twiceDailySnapshot.data,
    entities,
    entityRegistryMap,
    locale,
    primaryWeatherEntityId,
    t,
    use24HourTime,
    weatherForecastMode,
  ]);

  useEffect(() => {
    if (resolvedDevices.length > 0) {
      lastResolvedDevicesRef.current = resolvedDevices;
      return;
    }

    if (!supportsWeather) {
      lastResolvedDevicesRef.current = EMPTY_WEATHER_DEVICES;
      return;
    }

    if (entitiesHydrated) {
      lastResolvedDevicesRef.current = EMPTY_WEATHER_DEVICES;
    }
  }, [entitiesHydrated, resolvedDevices, supportsWeather]);

  return useMemo(() => {
    if (resolvedDevices.length > 0) {
      return resolvedDevices;
    }

    if (!supportsWeather) {
      return EMPTY_WEATHER_DEVICES;
    }

    if (!entitiesHydrated) {
      return lastResolvedDevicesRef.current;
    }

    return EMPTY_WEATHER_DEVICES;
  }, [entitiesHydrated, resolvedDevices, supportsWeather]);
}

export const useProviderWeatherDevicesCollection = useProviderWeatherDevices;
