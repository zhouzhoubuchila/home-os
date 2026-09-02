import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';

export interface PveRoleCompatibilityRule {
  role: string;
  allowedDomains: readonly string[];
  deviceClasses?: readonly string[];
  units?: readonly string[];
  valueTypes?: readonly string[];
  positiveEvidence: RegExp;
  negativeEvidence?: RegExp;
}

const TELEMETRY_DOMAINS = ['sensor', 'binary_sensor'] as const;
export const PVE_ROLE_COMPATIBILITY_MATRIX: readonly PveRoleCompatibilityRule[] = [
  {
    role: HOME_OS_ROLES.diagnosticHardwareVoltage,
    allowedDomains: ['sensor'],
    units: ['v', 'mv'],
    positiveEvidence: /voltage|volt|电压/,
  },
  {
    role: HOME_OS_ROLES.diagnosticMemoryModule,
    allowedDomains: ['sensor'],
    positiveEvidence: /dimm|memory module|ram module|内存条/,
  },
  { role: HOME_OS_ROLES.diagnosticTask, allowedDomains: ['sensor'], positiveEvidence: /task|任务/ },
  {
    role: HOME_OS_ROLES.homelabPveTemperature,
    allowedDomains: ['sensor'],
    deviceClasses: ['temperature'],
    units: ['°c', 'c', 'celsius'],
    positiveEvidence: /temperature|temp\b|温度/,
  },
  {
    role: HOME_OS_ROLES.homelabPveBackupProgress,
    allowedDomains: ['sensor'],
    units: ['%'],
    positiveEvidence: /backup.*progress|progress.*backup|备份.*进度/,
  },
  {
    role: HOME_OS_ROLES.homelabPveUpdateCount,
    allowedDomains: ['sensor'],
    positiveEvidence: /update.*count|updates available|可用更新/,
  },
  {
    role: HOME_OS_ROLES.homelabPveIoWait,
    allowedDomains: ['sensor'],
    units: ['%'],
    positiveEvidence: /io.?wait|iowait/,
  },
  {
    role: HOME_OS_ROLES.homelabPveVersion,
    allowedDomains: ['sensor'],
    valueTypes: ['string'],
    positiveEvidence: /version|版本/,
  },
  {
    role: HOME_OS_ROLES.homelabPveUptime,
    allowedDomains: ['sensor'],
    positiveEvidence: /uptime|running time|运行时间/,
  },
  {
    role: HOME_OS_ROLES.homelabPveContainerRunning,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:lxc|container).*running/,
  },
  {
    role: HOME_OS_ROLES.homelabPveContainerTotal,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:lxc|container).*total/,
  },
  {
    role: HOME_OS_ROLES.homelabPveVmRunning,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:vm|qemu).*running/,
  },
  {
    role: HOME_OS_ROLES.homelabPveVmTotal,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:vm|qemu).*total/,
  },
  {
    role: HOME_OS_ROLES.homelabPveMemoryUsed,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:memory|ram).*used|used.*(?:memory|ram)/,
    negativeEvidence: /dimm|module/,
  },
  {
    role: HOME_OS_ROLES.homelabPveMemoryTotal,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:memory|ram).*total|total.*(?:memory|ram)/,
    negativeEvidence: /dimm|module/,
  },
  {
    role: HOME_OS_ROLES.homelabPveMemory,
    allowedDomains: ['sensor'],
    positiveEvidence: /memory|\bram\b/,
    negativeEvidence: /dimm|module/,
  },
  {
    role: HOME_OS_ROLES.homelabPveStorageUsed,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:storage|disk).*used|used.*(?:storage|disk)/,
  },
  {
    role: HOME_OS_ROLES.homelabPveStorageTotal,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:storage|disk).*total|total.*(?:storage|disk)/,
  },
  {
    role: HOME_OS_ROLES.homelabPveStorage,
    allowedDomains: ['sensor'],
    positiveEvidence: /storage|disk|filesystem/,
  },
  {
    role: HOME_OS_ROLES.homelabPveLoad,
    allowedDomains: ['sensor'],
    positiveEvidence: /(?:^|\s)load(?:\s|$)|load average/,
  },
  {
    role: HOME_OS_ROLES.homelabPveCpu,
    allowedDomains: ['sensor'],
    positiveEvidence: /cpu|processor/,
  },
  {
    role: HOME_OS_ROLES.homelabPveStatus,
    allowedDomains: TELEMETRY_DOMAINS,
    positiveEvidence: /status|state/,
  },
];

const ONLINE_STATES = new Set([
  'on',
  'off',
  'online',
  'offline',
  'running',
  'stopped',
  'true',
  'false',
]);
const read = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export function resolvePveCompatibleRole(entity: NavetEntity, text: string): string | undefined {
  const domain = entity.externalId.split('.')[0] ?? '';
  const deviceClass = read(entity.attributes.deviceClass ?? entity.attributes.device_class);
  const unit = read(entity.attributes.unit ?? entity.attributes.unit_of_measurement);
  const valueType = typeof entity.primaryState;
  if (
    domain === 'sensor' &&
    /temperature|temp\b|温度/.test(text) &&
    (deviceClass === 'temperature' || ['°c', 'c', 'celsius'].includes(unit))
  ) {
    return HOME_OS_ROLES.homelabPveTemperature;
  }
  for (const rule of PVE_ROLE_COMPATIBILITY_MATRIX) {
    if (!rule.allowedDomains.includes(domain)) continue;
    if (rule.negativeEvidence?.test(text)) continue;
    const metadataMatches = rule.positiveEvidence.test(text);
    const classMatches = !rule.deviceClasses || rule.deviceClasses.includes(deviceClass);
    const unitMatches = !rule.units || rule.units.includes(unit);
    const valueMatches = !rule.valueTypes || rule.valueTypes.includes(valueType);
    if (metadataMatches && classMatches && unitMatches && valueMatches) return rule.role;
    if (rule.role === HOME_OS_ROLES.homelabPveTemperature && classMatches && unitMatches)
      return rule.role;
  }
  const state = String(entity.primaryState ?? '')
    .trim()
    .toLowerCase();
  const connectivityEvidence =
    /online|offline|connectivity|connected|availability|ping|reachable/.test(text);
  if (
    (domain === 'binary_sensor' || domain === 'switch') &&
    connectivityEvidence &&
    ONLINE_STATES.has(state)
  ) {
    return HOME_OS_ROLES.homelabPveOnline;
  }
  return undefined;
}
