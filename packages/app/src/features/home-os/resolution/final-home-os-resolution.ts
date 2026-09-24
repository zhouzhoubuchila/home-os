import type { DeviceWithType } from '@navet/app/types/device.types';
import {
  type ResolvedHomeOsFunctionalDevice,
  resolveFunctionalDevices,
} from '../adapters/functional-device-adapter';
import { HOME_OS_ROLES, type SemanticRole } from '../core/semantic-roles';
import type {
  HomeOsFunctionalDevice,
  HomeOsMetric,
  HomeOsPhysicalDevice,
  ResolvedSemanticEntity,
} from '../core/types';
import { isInternetRoleCompatible } from '../mapping/internet-role-compatibility';

const PVE_METRIC_ROLES: Record<string, SemanticRole> = {
  cpu: HOME_OS_ROLES.homelabPveCpu,
  temperature: HOME_OS_ROLES.homelabPveTemperature,
  memory: HOME_OS_ROLES.homelabPveMemory,
  storage: HOME_OS_ROLES.homelabPveStorage,
  uptime: HOME_OS_ROLES.homelabPveUptime,
};

export const ROUTER_METRIC_ORDER = [
  'online',
  'clients',
  'wan_ip',
  'lan_ip',
  'cpu',
  'memory',
  'temperature',
  'uptime',
  'upload',
  'download',
] as const;

export function resolveFinalFunctionalDevices(
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[]
) {
  return resolveFunctionalDevices(functionalDevices, entities);
}

export function resolveInternetOnlineState(
  online?: ResolvedSemanticEntity,
  latency?: ResolvedSemanticEntity
): HomeOsPhysicalDevice['state'] {
  const source = online ?? latency;
  if (!source || !isInternetRoleCompatible(source.entity, HOME_OS_ROLES.networkInternetOnline)) {
    return 'unknown';
  }
  if (source.entity.availability === 'unknown') return 'unknown';
  if (source.entity.availability === 'unavailable') return 'offline';

  const value = String(source.entity.primaryState ?? '')
    .trim()
    .toLowerCase();
  const probe =
    latency?.entity.externalId === source.entity.externalId ||
    isInternetRoleCompatible(source.entity, HOME_OS_ROLES.networkInternetLatency);
  if (probe) {
    return value !== '' && Number.isFinite(Number(value)) ? 'online' : 'unknown';
  }
  if (['on', 'online', 'available', 'true', 'connected', 'detected'].includes(value))
    return 'online';
  if (['off', 'offline', 'false', 'unavailable', 'disconnected', 'clear'].includes(value)) {
    return 'offline';
  }
  return 'unknown';
}

export function resolveFunctionalOnlineState(
  device: ResolvedHomeOsFunctionalDevice
): HomeOsPhysicalDevice['state'] {
  const source = device.metricEntities.online ?? device.stateEntity;
  const latency = device.metricEntities.latency;
  if (device.kind === 'internet') {
    const latencyId = device.metrics.latency;
    const unavailableProbe =
      !latency && latencyId
        ? device.entities.find(
            (item) =>
              [item.entity.id, item.entity.canonicalId, item.entity.externalId].includes(
                latencyId
              ) && isInternetRoleCompatible(item.entity, HOME_OS_ROLES.networkInternetOnline)
          )
        : undefined;
    return resolveInternetOnlineState(source, latency ?? unavailableProbe);
  }
  if (!source || source.entity.availability === 'unknown') return 'unknown';
  if (source.entity.availability === 'unavailable') return 'offline';
  const value = String(source.entity.primaryState ?? '')
    .trim()
    .toLowerCase();
  if (
    ['excellent', 'good', 'online', 'available', 'on', 'detected', 'true', 'home'].includes(value)
  )
    return 'online';
  if (['offline', 'unavailable', 'off', 'false', 'not detected'].includes(value)) return 'offline';
  return 'unknown';
}

function metric(role: SemanticRole, entity: ResolvedSemanticEntity): HomeOsMetric {
  const unit = entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement;
  return {
    role,
    value: entity.entity.primaryState,
    unit: typeof unit === 'string' ? unit : undefined,
    updatedAt: entity.entity.lastUpdated,
    stale: false,
    available: entity.entity.availability === 'available',
    sourceEntityId: entity.entity.externalId,
  };
}

export function buildFunctionalPveDevices(
  devices: readonly ResolvedHomeOsFunctionalDevice[]
): HomeOsPhysicalDevice[] {
  return devices
    .filter((device) => device.kind === 'pve')
    .map((device) => {
      const semanticMetrics: HomeOsPhysicalDevice['semanticMetrics'] = {};
      for (const [key, role] of Object.entries(PVE_METRIC_ROLES)) {
        const entity = device.metricEntities[key];
        if (entity) semanticMetrics[role] = metric(role, entity);
      }
      const state = resolveFunctionalOnlineState(device);
      return {
        id: device.id,
        name: device.name,
        category: 'homelab',
        room: device.room,
        state,
        freshness: device.entities.some((item) => item.entity.availability === 'available')
          ? 'fresh'
          : 'unavailable',
        health: state === 'online' ? 'normal' : state === 'offline' ? 'critical' : 'unknown',
        lastMeaningfulUpdate: (device.metricEntities.online ?? device.stateEntity)?.entity
          .lastUpdated,
        semanticMetrics,
        capabilities: [],
        entityIds: device.entities.map((item) => item.entity.externalId),
      };
    });
}

export interface FunctionalDeviceMetricRow {
  key: string;
  entity: ResolvedSemanticEntity;
}

export function functionalDeviceMetricRows(
  device: ResolvedHomeOsFunctionalDevice,
  order: readonly string[]
): FunctionalDeviceMetricRow[] {
  return order.flatMap((key) => {
    const entity = device.metricEntities[key];
    return entity ? [{ key, entity }] : [];
  });
}

export function resolveFinalPveDevices(
  devices: readonly ResolvedHomeOsFunctionalDevice[],
  automaticDevices: readonly HomeOsPhysicalDevice[]
): HomeOsPhysicalDevice[] {
  const functional = buildFunctionalPveDevices(devices);
  return functional.length ? functional : [...automaticDevices];
}

function deviceIdentifiers(device: DeviceWithType) {
  return [device.id, device.canonicalId, device.nativeId].filter((value): value is string =>
    Boolean(value)
  );
}

function entityIdentifiers(entity: ResolvedSemanticEntity) {
  return [entity.entity.id, entity.entity.canonicalId, entity.entity.externalId];
}

export function resolveFinalDashboardDeviceMap(
  raw: ReadonlyMap<string, DeviceWithType>,
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[]
): Map<string, DeviceWithType> {
  const resolvedDevices = resolveFinalFunctionalDevices(entities, functionalDevices);
  const resolvedByIdentifier = new Map<string, ResolvedSemanticEntity>();
  for (const entity of entities) {
    for (const id of entityIdentifiers(entity)) resolvedByIdentifier.set(id, entity);
  }
  const lightByIdentifier = new Map<string, ResolvedHomeOsFunctionalDevice>();
  for (const device of resolvedDevices.filter((item) => item.kind === 'light')) {
    for (const entity of device.entities) {
      for (const id of entityIdentifiers(entity)) lightByIdentifier.set(id, device);
    }
  }

  return new Map(
    [...raw].map(([key, device]) => {
      const identifiers = deviceIdentifiers(device);
      const semantic = identifiers.map((id) => resolvedByIdentifier.get(id)).find(Boolean);
      const functional = identifiers.map((id) => lightByIdentifier.get(id)).find(Boolean);
      const isSemanticLight = semantic?.roles.some(
        (role) => role === HOME_OS_ROLES.lightingLight || role === HOME_OS_ROLES.lightingSwitch
      );
      if (!functional && !isSemanticLight) return [key, device];
      const stateEntity = functional?.metricEntities.state ?? functional?.stateEntity ?? semantic;
      const state = String(stateEntity?.entity.primaryState ?? '').toLowerCase() === 'on';
      return [
        key,
        {
          ...device,
          type: 'lights',
          name: functional?.name ?? semantic?.displayName ?? device.name,
          room: functional?.room ?? semantic?.room ?? ('room' in device ? device.room : ''),
          state,
          brightness:
            typeof stateEntity?.entity.attributes.brightness === 'number'
              ? stateEntity.entity.attributes.brightness
              : 0,
          temp:
            typeof stateEntity?.entity.attributes.colorTemperature === 'number'
              ? stateEntity.entity.attributes.colorTemperature
              : 0,
        } as DeviceWithType,
      ];
    })
  );
}
