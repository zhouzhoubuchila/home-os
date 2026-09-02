import type { DeviceCollection, MediaDevice } from '@navet/app/types/device.types';
import type { ProductProjectionMetadata } from '@navet/app/types/product-projection';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { buildHomeOsLights } from '../adapters/lighting-adapter';
import { buildPvePhysicalDevices } from '../adapters/physical-device-adapter';
import type { HomeOsPhysicalDeviceConfig } from '../config/schema';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type {
  HomeOsFunctionalDevice,
  HomeOsPhysicalDevice,
  ResolvedSemanticEntity,
} from '../core/types';

export type ProjectedLightState = 'on' | 'off' | 'unknown' | 'unavailable';

export interface ProjectedLightCircuit {
  id: string;
  name: string;
  room: string;
  state: ProjectedLightState;
  brightness?: number;
  colorTemperatureKelvin?: number;
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsToggle: boolean;
  stateEntityId?: string;
  primaryCommandTarget?: string;
  projection: ProductProjectionMetadata;
  lastUpdated?: string;
}

export interface HomeOsProductProjection {
  astronomyEntities: ResolvedSemanticEntity[];
  lighting: ProjectedLightCircuit[];
  pveDevices: HomeOsPhysicalDevice[];
  securityExcludedEntityIds: ReadonlySet<string>;
  securityMetadataByEntityId: ReadonlyMap<string, ProductProjectionMetadata>;
}

const ASTRONOMY_DOMAINS = new Set(['sun', 'moon']);
const NON_SECURITY_CAMERA_ROLES = new Set<string>([
  HOME_OS_ROLES.vacuumMapCamera,
  HOME_OS_ROLES.applianceCamera,
  HOME_OS_ROLES.mediaCamera,
  HOME_OS_ROLES.diagnosticCamera,
]);

function identifierIndex(entities: readonly ResolvedSemanticEntity[]) {
  const result = new Map<string, ResolvedSemanticEntity>();
  for (const item of entities) {
    result.set(item.entity.id, item);
    result.set(item.entity.canonicalId, item);
    result.set(item.entity.externalId, item);
  }
  return result;
}

function canonicalTarget(
  target: string | undefined,
  entitiesById: ReadonlyMap<string, ResolvedSemanticEntity>
) {
  return target ? (entitiesById.get(target)?.entity.canonicalId ?? target) : undefined;
}

function compactTargets(targets: Array<string | undefined>) {
  return [...new Set(targets.filter((target): target is string => Boolean(target)))];
}

function projectedState(item: ResolvedSemanticEntity | undefined): ProjectedLightState {
  if (!item || item.entity.availability === 'unknown') return 'unknown';
  if (item.entity.availability === 'unavailable') return 'unavailable';
  if (item.entity.primaryState === true || item.entity.primaryState === 'on') return 'on';
  if (item.entity.primaryState === false || item.entity.primaryState === 'off') return 'off';
  return 'unknown';
}

function readBrightness(item: ResolvedSemanticEntity | undefined) {
  const value = item?.entity.attributes.brightnessPct ?? item?.entity.attributes.brightness;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value > 100 ? (value / 255) * 100 : value)));
}

function readColorTemperature(item: ResolvedSemanticEntity | undefined) {
  const value =
    item?.entity.attributes.colorTemperatureKelvin ?? item?.entity.attributes.colorTemperature;
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : undefined;
}

function buildLightingProjection(
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[]
) {
  const entitiesById = identifierIndex(entities);
  return buildHomeOsLights(entities, functionalDevices).map((light): ProjectedLightCircuit => {
    const stateEntity = light.stateSource
      ? entitiesById.get(light.stateSource.entityId)
      : undefined;
    const onTarget = canonicalTarget(light.actions.turnOn, entitiesById);
    const offTarget = canonicalTarget(light.actions.turnOff, entitiesById);
    const toggleTarget = canonicalTarget(light.actions.toggle, entitiesById);
    const brightnessTarget = canonicalTarget(light.actions.brightness, entitiesById);
    const colorTemperatureTarget = canonicalTarget(light.actions.colorTemperature, entitiesById);
    const colorTarget = canonicalTarget(light.actions.color, entitiesById);
    const sourceEntityIds = compactTargets(
      light.sourceEntityIds.map((id) => canonicalTarget(id, entitiesById))
    );
    const primaryCommandTarget = toggleTarget ?? onTarget ?? offTarget;
    const projection: ProductProjectionMetadata = {
      projectionId: light.id,
      sourceEntityIds,
      providerId: light.providerId,
      semanticSource: light.manual ? 'manual' : (stateEntity?.source ?? 'automatic'),
      commandTargets: {
        on: compactTargets([onTarget, toggleTarget]),
        off: compactTargets([offTarget, toggleTarget]),
        toggle: compactTargets([toggleTarget, onTarget, offTarget]),
        brightness: compactTargets([brightnessTarget]),
        colorTemperature: compactTargets([colorTemperatureTarget]),
        color: compactTargets([colorTarget]),
      },
    };

    return {
      id: light.id,
      name: light.name,
      room: light.room ?? 'Unknown',
      state: projectedState(stateEntity),
      brightness: readBrightness(stateEntity),
      colorTemperatureKelvin: readColorTemperature(stateEntity),
      supportsBrightness: Boolean(brightnessTarget),
      supportsColorTemperature: Boolean(colorTemperatureTarget),
      supportsToggle: Boolean(primaryCommandTarget),
      stateEntityId: stateEntity?.entity.canonicalId,
      primaryCommandTarget,
      projection,
      lastUpdated: stateEntity?.entity.lastUpdated,
    };
  });
}

function shouldExcludeFromSecurity(item: ResolvedSemanticEntity) {
  if (item.ignored || item.displayMode === 'hidden') return true;
  if (item.roles.some((role) => role.startsWith('appliance.'))) return true;
  if (item.roles.some((role) => NON_SECURITY_CAMERA_ROLES.has(role))) return true;
  return false;
}

function buildSecurityProjection(entities: readonly ResolvedSemanticEntity[]) {
  const excluded = new Set<string>();
  const metadata = new Map<string, ProductProjectionMetadata>();

  for (const item of entities) {
    const ids = [item.entity.id, item.entity.canonicalId, item.entity.externalId];
    if (shouldExcludeFromSecurity(item)) {
      ids.forEach((id) => {
        excluded.add(id);
      });
      continue;
    }
    if (!item.roles.some((role) => role.startsWith('security.'))) continue;
    const projection: ProductProjectionMetadata = {
      projectionId: `security:${item.entity.canonicalId}`,
      sourceEntityIds: [item.entity.canonicalId],
      providerId: item.entity.providerId,
      semanticSource: item.source,
      commandTargets: { primary: [item.entity.canonicalId] },
    };
    ids.forEach((id) => {
      metadata.set(id, projection);
    });
  }

  return { excluded, metadata };
}

export function buildHomeOsProductProjection({
  entities,
  functionalDevices = [],
  physicalDevices = [],
}: {
  entities: readonly ResolvedSemanticEntity[];
  functionalDevices?: readonly HomeOsFunctionalDevice[];
  physicalDevices?: readonly HomeOsPhysicalDeviceConfig[];
}): HomeOsProductProjection {
  const security = buildSecurityProjection(entities);
  return {
    astronomyEntities: entities.filter((item) =>
      ASTRONOMY_DOMAINS.has(item.entity.externalId.split('.')[0] ?? '')
    ),
    lighting: buildLightingProjection(entities, functionalDevices),
    pveDevices: buildPvePhysicalDevices(entities, physicalDevices),
    securityExcludedEntityIds: security.excluded,
    securityMetadataByEntityId: security.metadata,
  };
}

export function projectSecurityDeviceCollection(
  devices: DeviceCollection,
  projection: Pick<
    HomeOsProductProjection,
    'securityExcludedEntityIds' | 'securityMetadataByEntityId'
  >
): DeviceCollection {
  const mapDevice = <T extends DeviceCollection[keyof DeviceCollection][number]>(device: T) => {
    const metadata =
      projection.securityMetadataByEntityId.get(device.id) ??
      (device.canonicalId
        ? projection.securityMetadataByEntityId.get(device.canonicalId)
        : undefined) ??
      (device.nativeId ? projection.securityMetadataByEntityId.get(device.nativeId) : undefined);
    return metadata ? { ...device, projection: metadata } : device;
  };
  const includeDevice = (device: DeviceCollection[keyof DeviceCollection][number]) =>
    !projection.securityExcludedEntityIds.has(device.id) &&
    (!device.canonicalId || !projection.securityExcludedEntityIds.has(device.canonicalId)) &&
    (!device.nativeId || !projection.securityExcludedEntityIds.has(device.nativeId));
  const project = <T extends DeviceCollection[keyof DeviceCollection][number]>(items: T[]) =>
    items.filter(includeDevice).map(mapDevice) as T[];

  return {
    ...devices,
    cameras: project(devices.cameras),
    covers: project(devices.covers),
    helpers: project(devices.helpers),
    locks: project(devices.locks),
    persons: project(devices.persons),
    sensors: project(devices.sensors),
  };
}

type ProjectedMediaDevice = MediaDevice & { type: 'media' };

function mediaStateRank(device: MediaDevice) {
  return device.state === 'playing'
    ? 0
    : device.state === 'paused'
      ? 1
      : device.state === 'idle'
        ? 2
        : 3;
}

function mediaPhysicalKey(device: MediaDevice) {
  return device.underlyingDeviceId
    ? `${device.providerId ?? 'unscoped'}:device:${device.underlyingDeviceId}`
    : `${device.providerId ?? 'unscoped'}:entity:${device.canonicalId ?? device.id}`;
}

export function projectPhysicalMediaDevices(devices: readonly ProjectedMediaDevice[]) {
  const groups = new Map<string, ProjectedMediaDevice[]>();
  for (const device of devices) {
    const key = mediaPhysicalKey(device);
    groups.set(key, [...(groups.get(key) ?? []), device]);
  }

  return [...groups.entries()].map(([key, members]) => {
    const ordered = [...members].sort(
      (left, right) =>
        mediaStateRank(left) - mediaStateRank(right) || left.id.localeCompare(right.id)
    );
    const representative = ordered[0] as ProjectedMediaDevice;
    const sourceEntityIds = members.map((member) => member.canonicalId ?? member.id);
    const providerId = representative.providerId as IntegrationProviderId | undefined;
    return {
      ...representative,
      supportsGrouping: members.some((member) => member.supportsGrouping),
      supportsNextTrack: members.some((member) => member.supportsNextTrack),
      supportsPreviousTrack: members.some((member) => member.supportsPreviousTrack),
      groupMembers: compactTargets(members.flatMap((member) => member.groupMembers ?? [])),
      projection: {
        projectionId: `media:${key}`,
        sourceEntityIds,
        providerId,
        semanticSource: 'physical-device',
        commandTargets: {
          primary: [representative.id],
          members: members.map((member) => member.id),
        },
      },
    } satisfies ProjectedMediaDevice;
  });
}
