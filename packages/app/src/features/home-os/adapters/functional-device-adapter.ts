import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';
import { isInternetRoleCompatible } from '../mapping/internet-role-compatibility';

export interface ResolvedHomeOsFunctionalDevice extends HomeOsFunctionalDevice {
  stateEntity?: ResolvedSemanticEntity;
  controlEntities: Partial<
    Record<keyof NonNullable<HomeOsFunctionalDevice['controls']>, ResolvedSemanticEntity>
  >;
  metricEntities: Record<string, ResolvedSemanticEntity | undefined>;
  entities: ResolvedSemanticEntity[];
  missingEntityIds: string[];
}

const BATH_HEATER_HINTS = /bath.?heater|bathroom.?heater|浴霸|暖风机|风暖/;
const INTERNET_METRIC_ROLES: Record<string, string> = {
  online: HOME_OS_ROLES.networkInternetOnline,
  latency: HOME_OS_ROLES.networkInternetLatency,
  packet_loss: HOME_OS_ROLES.networkInternetPacketLoss,
  jitter: HOME_OS_ROLES.networkInternetJitter,
  download: HOME_OS_ROLES.networkInternetDownload,
  upload: HOME_OS_ROLES.networkInternetUpload,
};

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
  const byExternalId = new Map<string, ResolvedSemanticEntity>();
  for (const item of entities) {
    byExternalId.set(item.entity.id, item);
    byExternalId.set(item.entity.canonicalId, item);
    byExternalId.set(item.entity.externalId, item);
  }
  return configs.map((config) => {
    const compatibleInternetEntity = (entity: ResolvedSemanticEntity | undefined, role: string) =>
      entity && isInternetRoleCompatible(entity.entity, role) ? entity : undefined;
    const stateEntity = config.stateEntityId ? byExternalId.get(config.stateEntityId) : undefined;
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
      stateEntity:
        config.kind === 'internet'
          ? compatibleInternetEntity(stateEntity, HOME_OS_ROLES.networkInternetOnline)
          : stateEntity,
      controlEntities: Object.fromEntries(
        Object.entries(config.controls ?? {}).flatMap(([key, entityId]) => {
          const entity = entityId ? byExternalId.get(entityId) : undefined;
          return entity ? [[key, entity]] : [];
        })
      ),
      metricEntities: Object.fromEntries(
        Object.entries(config.metrics).map(([key, entityId]) => {
          const entity = byExternalId.get(entityId);
          return [
            key,
            config.kind === 'internet' && INTERNET_METRIC_ROLES[key]
              ? compatibleInternetEntity(entity, INTERNET_METRIC_ROLES[key])
              : entity,
          ];
        })
      ),
      entities: members,
      missingEntityIds: [...referencedIds].filter((entityId) => !byExternalId.has(entityId)),
    };
  });
}
