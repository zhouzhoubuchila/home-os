import type { HomeOsPhysicalDeviceConfig } from '../config/schema';
import { uniqueCapabilities } from '../core/capabilities';
import type { HomeOsMetric, HomeOsPhysicalDevice, ResolvedSemanticEntity } from '../core/types';

const readString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const STATIC_ROLES = new Set(['homelab.pve.version', 'homelab.home_assistant.version']);
const SLOW_ROLES = new Set([
  'energy.electricity.balance',
  'energy.electricity.month',
  'energy.electricity.year',
  'energy.gas.current',
]);
const OFFLINE_STATES = new Set(['off', 'offline', 'disconnected', 'unavailable', 'false', '0']);

function isStale(updatedAt: string | undefined, now: number, thresholdMs: number) {
  if (!updatedAt) return true;
  const timestamp = Date.parse(updatedAt);
  return !Number.isFinite(timestamp) || now - timestamp > thresholdMs;
}

export function buildPhysicalDevices(
  entities: readonly ResolvedSemanticEntity[],
  configs: readonly HomeOsPhysicalDeviceConfig[] = [],
  options: { now?: number; staleThresholdMs?: number } = {}
): HomeOsPhysicalDevice[] {
  const now = options.now ?? Date.now();
  const staleThresholdMs = options.staleThresholdMs ?? 5 * 60_000;
  const configByEntityId = new Map(
    configs.flatMap((config) => config.entityIds.map((entityId) => [entityId, config] as const))
  );
  const groups = new Map<string, ResolvedSemanticEntity[]>();

  for (const resolved of entities) {
    if (resolved.ignored || resolved.displayMode === 'hidden' || resolved.roles.length === 0)
      continue;
    const configured = configByEntityId.get(resolved.entity.externalId);
    const deviceId = readString(
      resolved.entity.attributes.deviceId ?? resolved.entity.attributes.device_id
    );
    const deviceName = readString(
      resolved.entity.attributes.deviceName ?? resolved.entity.attributes.device_name
    );
    const semanticDeviceId =
      resolved.roles.some((role) => role.startsWith('homelab.pve.')) && deviceName
        ? `pve:${resolved.entity.providerId}:${deviceName.trim().toLowerCase()}`
        : undefined;
    const groupId =
      resolved.mapping?.physicalDeviceId ??
      configured?.id ??
      deviceId ??
      semanticDeviceId ??
      resolved.entity.canonicalId;
    groups.set(groupId, [...(groups.get(groupId) ?? []), resolved]);
  }

  return [...groups.entries()].map(([id, members]) => {
    const config = configs.find((item) => item.id === id);
    const semanticMetrics: Record<string, HomeOsMetric> = {};
    for (const member of members) {
      for (const role of member.roles) {
        semanticMetrics[role] = {
          role,
          value: member.entity.primaryState,
          unit: readString(
            member.entity.attributes.unit ?? member.entity.attributes.unit_of_measurement
          ),
          updatedAt: member.entity.lastUpdated,
          stale: STATIC_ROLES.has(role)
            ? false
            : isStale(
                member.entity.lastUpdated,
                now,
                SLOW_ROLES.has(role) ? 7 * 86_400_000 : staleThresholdMs
              ),
          available: member.entity.availability === 'available',
          sourceEntityId: member.entity.externalId,
        };
      }
    }
    const availability = members.map(({ entity }) => entity.availability);
    const meaningfulMetrics = Object.values(semanticMetrics).filter(
      (metric) => !STATIC_ROLES.has(metric.role)
    );
    const freshestMetric = meaningfulMetrics
      .filter((metric) => metric.updatedAt)
      .sort(
        (left, right) => Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? '')
      )[0];
    const connectivityMetric =
      semanticMetrics['homelab.pve.online'] ?? semanticMetrics['homelab.pve.status'];
    const state = connectivityMetric
      ? OFFLINE_STATES.has(String(connectivityMetric.value).toLowerCase())
        ? 'offline'
        : connectivityMetric.available
          ? 'online'
          : 'unknown'
      : availability.some((value) => value === 'available')
        ? 'online'
        : availability.every((value) => value === 'unavailable')
          ? 'offline'
          : 'unknown';
    const freshness = meaningfulMetrics.length
      ? meaningfulMetrics.some((metric) => metric.available && !metric.stale)
        ? 'fresh'
        : meaningfulMetrics.some((metric) => metric.available)
          ? 'stale'
          : 'unavailable'
      : 'unavailable';
    return {
      id,
      name:
        config?.name ??
        readString(
          members[0]?.entity.attributes.deviceName ?? members[0]?.entity.attributes.device_name
        ) ??
        members[0]?.displayName ??
        id,
      category: config?.category ?? members[0]?.roles[0]?.split('.')[0] ?? 'device',
      room: config?.room ?? members.find(({ room }) => room)?.room,
      state,
      freshness,
      health:
        state === 'offline'
          ? 'critical'
          : freshness === 'stale'
            ? 'warning'
            : state === 'online'
              ? 'normal'
              : 'unknown',
      lastMeaningfulUpdate: freshestMetric?.updatedAt,
      semanticMetrics,
      capabilities: uniqueCapabilities(members.flatMap(({ entity }) => entity.capabilities)),
      entityIds: members.map(({ entity }) => entity.externalId),
    };
  });
}

export function buildPvePhysicalDevices(
  entities: readonly ResolvedSemanticEntity[],
  configs: readonly HomeOsPhysicalDeviceConfig[] = [],
  options: { now?: number; staleThresholdMs?: number } = {}
) {
  return buildPhysicalDevices(
    entities.filter((entity) => entity.roles.some((role) => role.startsWith('homelab.pve.'))),
    configs,
    options
  );
}
