import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { SemanticCandidate } from '../core/types';

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const domainOf = (entity: NavetEntity) => entity.externalId.split('.')[0] ?? '';
const candidate = (
  role: string,
  confidence: number,
  source: SemanticCandidate['source'],
  ...reasons: string[]
): SemanticCandidate => ({ role, confidence, source, reasons });

function explicitCandidates(entity: NavetEntity): SemanticCandidate[] {
  const value = entity.attributes.homeOsRoles ?? entity.attributes.home_os_roles;
  const roles = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return roles
    .filter((role): role is string => typeof role === 'string' && role.includes('.'))
    .map((role) => candidate(role, 1, 'explicit_metadata', 'explicit Home OS metadata'));
}

export function classifyEntity(entity: NavetEntity): SemanticCandidate[] {
  const explicit = explicitCandidates(entity);
  if (explicit.length) return explicit;

  const domain = domainOf(entity);
  const deviceClass = readString(entity.attributes.deviceClass ?? entity.attributes.device_class);
  const integration = readString(
    entity.attributes.integration ?? entity.attributes.platform
  ).toLowerCase();
  const unit = readString(
    entity.attributes.unit ?? entity.attributes.unit_of_measurement
  ).toLowerCase();
  const name = `${entity.externalId} ${entity.name}`.toLowerCase();
  const result: SemanticCandidate[] = [];

  if (domain === 'person') {
    result.push(candidate(HOME_OS_ROLES.familyPerson, 0.99, 'domain', 'domain=person'));
  } else if (domain === 'device_tracker') {
    result.push(candidate(HOME_OS_ROLES.familyTracker, 0.98, 'domain', 'domain=device_tracker'));
  } else if (domain === 'light') {
    result.push(candidate(HOME_OS_ROLES.lightingLight, 0.99, 'domain', 'domain=light'));
  } else if (domain === 'switch') {
    result.push(candidate(HOME_OS_ROLES.deviceSwitch, 0.95, 'domain', 'domain=switch'));
  } else if (domain === 'lock') {
    result.push(candidate(HOME_OS_ROLES.securityLock, 0.99, 'domain', 'domain=lock'));
  }

  const deviceClassRoles: Record<string, string> = {
    temperature: HOME_OS_ROLES.environmentTemperature,
    humidity: HOME_OS_ROLES.environmentHumidity,
    door: HOME_OS_ROLES.securityDoor,
    garage_door: HOME_OS_ROLES.securityDoor,
    opening: HOME_OS_ROLES.securityDoor,
    window: HOME_OS_ROLES.securityWindow,
    moisture: HOME_OS_ROLES.securityWaterLeak,
    smoke: HOME_OS_ROLES.securitySmoke,
    battery: HOME_OS_ROLES.diagnosticBattery,
    connectivity: HOME_OS_ROLES.diagnosticConnectivity,
  };
  const roleFromClass = deviceClassRoles[deviceClass];
  if (roleFromClass) {
    result.push(candidate(roleFromClass, 0.96, 'device_metadata', `device_class=${deviceClass}`));
  }

  if (integration.includes('proxmox')) {
    const role =
      deviceClass === 'temperature' || unit === '°c'
        ? HOME_OS_ROLES.homelabPveTemperature
        : name.includes('memory')
          ? HOME_OS_ROLES.homelabPveMemory
          : name.includes('cpu')
            ? HOME_OS_ROLES.homelabPveCpu
            : HOME_OS_ROLES.homelabPveOnline;
    result.push(candidate(role, 0.94, 'integration', `integration=${integration}`));
  }

  const fallbackRules: Array<[RegExp, string]> = [
    [/\bpve\b|proxmox/, HOME_OS_ROLES.homelabPveOnline],
    [/state.?grid|国家电网/, HOME_OS_ROLES.energyElectricityToday],
    [/towngas|港华燃气/, HOME_OS_ROLES.energyGasCurrent],
    [/latency|延迟/, HOME_OS_ROLES.networkInternetLatency],
    [/packet.?loss|丢包/, HOME_OS_ROLES.networkInternetPacketLoss],
  ];
  if (!result.some(({ confidence }) => confidence >= 0.9)) {
    const matched = fallbackRules.find(([pattern]) => pattern.test(name));
    if (matched) {
      result.push(candidate(matched[1], 0.55, 'regex_fallback', 'low priority name fallback'));
    }
  }

  return result.sort((left, right) => right.confidence - left.confidence);
}
