import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';

export interface ResolvedHomeOsFunctionalDevice extends HomeOsFunctionalDevice {
  entities: ResolvedSemanticEntity[];
  missingEntityIds: string[];
}

const BATH_HEATER_HINTS = /bath.?heater|bathroom.?heater|浴霸|暖风机|风暖/;

export function discoverBathHeaterFunctionalDevices(
  entities: readonly ResolvedSemanticEntity[]
): HomeOsFunctionalDevice[] {
  const groups = new Map<string, ResolvedSemanticEntity[]>();
  for (const item of entities) {
    const attributes = item.entity.attributes;
    const text = [
      item.entity.externalId,
      item.displayName,
      attributes.deviceName,
      attributes.device_name,
      attributes.model,
      attributes.manufacturer,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    if (!BATH_HEATER_HINTS.test(text)) continue;
    const deviceId = attributes.deviceId ?? attributes.device_id;
    const key =
      typeof deviceId === 'string' && deviceId ? deviceId : `room:${item.room ?? 'unknown'}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map(([deviceId, members]) => {
    const controls = members.filter((item) => /^(switch|button)\./.test(item.entity.externalId));
    const stateEntity = members.find((item) => item.entity.externalId.startsWith('switch.'));
    const primaryControl = controls[0]?.entity.externalId;
    return {
      id: `bath-heater:${deviceId}`,
      kind: 'appliance',
      name: String(
        members[0]?.entity.attributes.deviceName ??
          members[0]?.entity.attributes.device_name ??
          members[0]?.displayName ??
          'Bath heater'
      ),
      room: members.find((item) => item.room)?.room,
      stateEntityId: stateEntity?.entity.externalId,
      controls: primaryControl
        ? primaryControl.startsWith('button.')
          ? { toggle: primaryControl }
          : { toggle: primaryControl, on: primaryControl, off: primaryControl }
        : undefined,
      metrics: Object.fromEntries(
        members
          .filter((item) => item.entity.externalId.startsWith('sensor.'))
          .map((item) => [item.entity.externalId, item.entity.externalId])
      ),
      sourceEntityIds: members.map((item) => item.entity.externalId),
    };
  });
}

export function resolveFunctionalDevices(
  configs: readonly HomeOsFunctionalDevice[],
  entities: readonly ResolvedSemanticEntity[]
): ResolvedHomeOsFunctionalDevice[] {
  const byExternalId = new Map(entities.map((item) => [item.entity.externalId, item]));
  return configs.map((config) => {
    const referencedIds = new Set([
      ...config.sourceEntityIds,
      ...(config.stateEntityId ? [config.stateEntityId] : []),
      ...Object.values(config.controls ?? {}).filter((value): value is string => Boolean(value)),
      ...Object.values(config.metrics),
    ]);
    const members = [...referencedIds]
      .map((entityId) => byExternalId.get(entityId))
      .filter((item): item is ResolvedSemanticEntity => Boolean(item));
    return {
      ...config,
      entities: members,
      missingEntityIds: [...referencedIds].filter((entityId) => !byExternalId.has(entityId)),
    };
  });
}
