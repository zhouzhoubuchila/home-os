import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { SemanticCandidate } from '../core/types';

const read = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const HOST_CONTEXT = /home[._ -]?assistant(?:[._ -]?(?:host|core|server))?|\bhaos\b|\bhass\b/i;
const FOREIGN_DEVICE =
  /\b(?:pve|proxmox|router|openwrt|nas|synology|qnap|television|\btv\b|phone|iphone|android|mobile)\b/i;

function hostContext(entity: NavetEntity) {
  if (entity.providerId !== 'home_assistant') return false;
  const attributes = entity.attributes;
  const integration = read(attributes.integration ?? attributes.platform);
  const device = [
    attributes.deviceName,
    attributes.device_name,
    attributes.manufacturer,
    attributes.model,
  ]
    .map(read)
    .filter(Boolean)
    .join(' ');
  if (FOREIGN_DEVICE.test(device) || FOREIGN_DEVICE.test(`${entity.externalId} ${entity.name}`))
    return false;
  if (HOST_CONTEXT.test(device)) return true;
  // Registry platform is the stable source; System Monitor samples the HA host even
  // when its device is named simply "System Monitor" or another user-defined label.
  return integration === 'systemmonitor';
}

const metricText = (entity: NavetEntity) => `${entity.externalId} ${entity.name}`.toLowerCase();
const unitOf = (entity: NavetEntity) =>
  read(entity.attributes.unit ?? entity.attributes.unit_of_measurement);
const finite = (entity: NavetEntity) =>
  entity.primaryState !== null &&
  String(entity.primaryState).trim() !== '' &&
  Number.isFinite(Number(entity.primaryState));

export function isHomeAssistantRoleCompatible(entity: NavetEntity, role: string) {
  if (!role.startsWith('homelab.home_assistant.')) return true;
  if (!hostContext(entity)) return false;
  const domain = entity.externalId.split('.')[0];
  const text = metricText(entity);
  switch (role) {
    case HOME_OS_ROLES.homelabHomeAssistantOnline:
      return (
        (domain === 'sensor' || domain === 'binary_sensor') &&
        /online|status|connectivity|reachable|running|在线|运行状态/.test(text) &&
        /^(?:on|off|online|offline|running|stopped|connected|disconnected|true|false)$/i.test(
          String(entity.primaryState)
        )
      );
    case HOME_OS_ROLES.homelabHomeAssistantVersion:
      return (
        domain === 'sensor' &&
        /version|版本/.test(text) &&
        /^\d{4}\.\d+(?:\.\d+)?/.test(String(entity.primaryState))
      );
    case HOME_OS_ROLES.homelabHomeAssistantCpu:
      return (
        domain === 'sensor' &&
        /(?:^|[._\s-])cpu(?:$|[._\s-])|processor|处理器/.test(text) &&
        finite(entity) &&
        unitOf(entity) === '%'
      );
    case HOME_OS_ROLES.homelabHomeAssistantMemory:
      return (
        domain === 'sensor' &&
        /memory|\bram\b|内存/.test(text) &&
        !/free|available|空闲|可用/.test(text) &&
        finite(entity) &&
        unitOf(entity) === '%'
      );
    case HOME_OS_ROLES.homelabHomeAssistantStorage:
      return (
        domain === 'sensor' &&
        /disk|storage|磁盘|存储/.test(text) &&
        !/free|available|剩余|空闲|可用/.test(text) &&
        finite(entity) &&
        unitOf(entity) === '%'
      );
    case HOME_OS_ROLES.homelabHomeAssistantUptime: {
      if (domain !== 'sensor' || !/uptime|last.?boot|运行时间|启动时间/.test(text)) return false;
      const value = String(entity.primaryState ?? '').trim();
      const deviceClass = read(entity.attributes.deviceClass ?? entity.attributes.device_class);
      const timestamp =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && Number.isFinite(Date.parse(value));
      const duration =
        finite(entity) &&
        (/^(?:s|sec|seconds?|min|minutes?|h|hours?|d|days?)$/.test(unitOf(entity)) ||
          deviceClass === 'duration');
      const readable =
        /^\d+(?:\.\d+)?\s*(?:周|天|小时|分钟|秒|weeks?|days?|hours?|minutes?)$/i.test(value);
      return timestamp || duration || readable;
    }
    default:
      return false;
  }
}

export function resolveHomeAssistantCompatibleRoles(entity: NavetEntity): SemanticCandidate[] {
  const roles = [
    HOME_OS_ROLES.homelabHomeAssistantOnline,
    HOME_OS_ROLES.homelabHomeAssistantVersion,
    HOME_OS_ROLES.homelabHomeAssistantCpu,
    HOME_OS_ROLES.homelabHomeAssistantMemory,
    HOME_OS_ROLES.homelabHomeAssistantStorage,
    HOME_OS_ROLES.homelabHomeAssistantUptime,
  ];
  return roles
    .filter((role) => isHomeAssistantRoleCompatible(entity, role))
    .map((role) => ({
      role,
      confidence: 0.97,
      source: 'registry_metadata' as const,
      reasons: ['verified Home Assistant host context and metric shape'],
    }));
}
