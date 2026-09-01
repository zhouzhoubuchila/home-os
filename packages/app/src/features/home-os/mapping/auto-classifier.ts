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

function metadataText(entity: NavetEntity) {
  const attributes = entity.attributes;
  return [
    entity.externalId,
    entity.name,
    entity.room,
    attributes.integration,
    attributes.platform,
    attributes.deviceName,
    attributes.device_name,
    attributes.model,
    attributes.manufacturer,
    attributes.viaDeviceName,
    attributes.via_device_name,
  ]
    .map(readString)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function pveRole(name: string, deviceClass: string, unit: string) {
  if (deviceClass === 'temperature' || unit === '°c' || /temperature|temp(?:erature)?\b/.test(name))
    return HOME_OS_ROLES.homelabPveTemperature;
  if (/backup.*progress|progress.*backup/.test(name)) return HOME_OS_ROLES.homelabPveBackupProgress;
  if (/version/.test(name)) return HOME_OS_ROLES.homelabPveVersion;
  if (/uptime|running time/.test(name)) return HOME_OS_ROLES.homelabPveUptime;
  if (/lxc.*running|container.*running/.test(name)) return HOME_OS_ROLES.homelabPveContainerRunning;
  if (/lxc.*total|container.*total/.test(name)) return HOME_OS_ROLES.homelabPveContainerTotal;
  if (/vm.*running|qemu.*running/.test(name)) return HOME_OS_ROLES.homelabPveVmRunning;
  if (/vm.*total|qemu.*total/.test(name)) return HOME_OS_ROLES.homelabPveVmTotal;
  if (/memory.*used|used.*memory|ram.*used/.test(name)) return HOME_OS_ROLES.homelabPveMemoryUsed;
  if (/memory.*total|total.*memory|ram.*total/.test(name))
    return HOME_OS_ROLES.homelabPveMemoryTotal;
  if (/memory|\bram\b/.test(name)) return HOME_OS_ROLES.homelabPveMemory;
  if (/storage.*used|disk.*used|used.*storage/.test(name))
    return HOME_OS_ROLES.homelabPveStorageUsed;
  if (/storage.*total|disk.*total|total.*storage/.test(name))
    return HOME_OS_ROLES.homelabPveStorageTotal;
  if (/storage|disk|filesystem/.test(name)) return HOME_OS_ROLES.homelabPveStorage;
  if (/load/.test(name)) return HOME_OS_ROLES.homelabPveLoad;
  if (/cpu|processor/.test(name)) return HOME_OS_ROLES.homelabPveCpu;
  if (/status|state/.test(name)) return HOME_OS_ROLES.homelabPveStatus;
  return HOME_OS_ROLES.homelabPveOnline;
}

function isApplianceInternalTemperature(name: string, entityCategory: string) {
  return (
    entityCategory === 'diagnostic' ||
    /freezer|refrigerator|fridge|冷冻|冷藏|冰箱|compressor|device internal|内部温度/.test(name)
  );
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
  const name = metadataText(entity);
  const entityCategory = readString(
    entity.attributes.entityCategory ?? entity.attributes.entity_category
  ).toLowerCase();
  const result: SemanticCandidate[] = [];

  // Stable device and integration context is authoritative over generic metric semantics.
  const pveContext =
    integration.includes('proxmox') ||
    integration.includes('pve') ||
    /\bproxmox\b|\bpve\b|proxmoxve/.test(name);
  if (pveContext) {
    result.push(
      candidate(
        pveRole(name, deviceClass, unit),
        integration.includes('proxmox') ? 0.99 : 0.94,
        integration ? 'integration' : 'device_metadata',
        integration ? `integration=${integration}` : 'device context=PVE',
        deviceClass ? `device_class=${deviceClass}` : 'metric inferred from stable device context'
      )
    );
    return result;
  }

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
  } else if (domain === 'weather') {
    result.push(candidate(HOME_OS_ROLES.weatherCurrent, 0.99, 'domain', 'domain=weather'));
  } else if (domain === 'calendar') {
    result.push(candidate(HOME_OS_ROLES.familyCalendar, 0.99, 'domain', 'domain=calendar'));
  } else if (domain === 'scene') {
    result.push(candidate(HOME_OS_ROLES.homeMode, 0.98, 'domain', 'domain=scene'));
  } else if (domain === 'vacuum') {
    result.push(candidate(HOME_OS_ROLES.homeCleaning, 0.99, 'domain', 'domain=vacuum'));
  }

  const deviceClassRoles: Record<string, string> = {
    humidity: HOME_OS_ROLES.environmentHumidity,
    door: HOME_OS_ROLES.securityDoor,
    garage_door: HOME_OS_ROLES.securityDoor,
    opening: HOME_OS_ROLES.securityDoor,
    window: HOME_OS_ROLES.securityWindow,
    moisture: HOME_OS_ROLES.securityWaterLeak,
    smoke: HOME_OS_ROLES.securitySmoke,
    battery: HOME_OS_ROLES.diagnosticBattery,
    connectivity: HOME_OS_ROLES.diagnosticConnectivity,
    aqi: HOME_OS_ROLES.environmentAirQuality,
    pm25: HOME_OS_ROLES.environmentPm25,
    carbon_dioxide: HOME_OS_ROLES.environmentCo2,
  };
  if (deviceClass === 'temperature') {
    result.push(
      candidate(
        isApplianceInternalTemperature(name, entityCategory)
          ? HOME_OS_ROLES.applianceInternalTemperature
          : HOME_OS_ROLES.environmentTemperature,
        entityCategory === 'diagnostic' ? 0.99 : 0.96,
        'device_metadata',
        `device_class=${deviceClass}`,
        entityCategory ? `entity_category=${entityCategory}` : 'environmental sensor context'
      )
    );
  }
  const roleFromClass = deviceClassRoles[deviceClass];
  if (roleFromClass) {
    result.push(candidate(roleFromClass, 0.96, 'device_metadata', `device_class=${deviceClass}`));
  }

  if (integration.includes('home_assistant') || integration.includes('systemmonitor')) {
    const role = name.includes('version')
      ? HOME_OS_ROLES.homelabHomeAssistantVersion
      : name.includes('memory')
        ? HOME_OS_ROLES.homelabHomeAssistantMemory
        : name.includes('cpu')
          ? HOME_OS_ROLES.homelabHomeAssistantCpu
          : HOME_OS_ROLES.homelabHomeAssistantOnline;
    result.push(candidate(role, 0.9, 'integration', `integration=${integration}`));
  }

  if (integration.includes('openwrt') || integration.includes('immortalwrt')) {
    const role = name.includes('client')
      ? HOME_OS_ROLES.networkRouterClients
      : name.includes('uptime')
        ? HOME_OS_ROLES.networkRouterUptime
        : HOME_OS_ROLES.networkRouterOnline;
    result.push(candidate(role, 0.92, 'integration', `integration=${integration}`));
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
