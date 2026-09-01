import type { HomeOsPhysicalDeviceConfig } from '../config/schema';
import { uniqueCapabilities } from '../core/capabilities';
import type { HomeOsMetric, HomeOsPhysicalDevice, ResolvedSemanticEntity } from '../core/types';

const readString = (value: unknown) => (typeof value === 'string' ? value : undefined);

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
    const groupId =
      resolved.mapping?.physicalDeviceId ??
      configured?.id ??
      deviceId ??
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
          stale: isStale(member.entity.lastUpdated, now, staleThresholdMs),
          available: member.entity.availability === 'available',
          sourceEntityId: member.entity.externalId,
        };
      }
    }
    const availability = members.map(({ entity }) => entity.availability);
    return {
      id,
      name: config?.name ?? members[0]?.displayName ?? id,
      category: config?.category ?? members[0]?.roles[0]?.split('.')[0] ?? 'device',
      room: config?.room ?? members.find(({ room }) => room)?.room,
      state: availability.some((value) => value === 'available')
        ? 'online'
        : availability.every((value) => value === 'unavailable')
          ? 'offline'
          : 'unknown',
      semanticMetrics,
      capabilities: uniqueCapabilities(members.flatMap(({ entity }) => entity.capabilities)),
      entityIds: members.map(({ entity }) => entity.externalId),
    };
  });
}
