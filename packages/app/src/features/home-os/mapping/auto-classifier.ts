import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { SemanticCandidate } from '../core/types';
import { resolveCameraCompatibleRole } from './camera-role-compatibility';
import { resolvePveCompatibleRole } from './pve-role-compatibility';
import { resolveRouterCompatibleRole } from './router-role-compatibility';

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
    attributes.configEntry,
    attributes.config_entry,
    attributes.identifiers,
  ]
    .map(readString)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const REFRIGERATION_HINTS =
  /freezer|refrigerator|fridge|refrigeration|冷冻|冷藏|冰箱|制冷室|冷冻室|冷藏室|compressor/;
const INTERNAL_DEVICE_HINTS =
  /router|gateway|openwrt|immortalwrt|chip|board|mcu|soc|路由|网关|芯片|板载|device internal|内部温度/;
const ENVIRONMENT_HINTS =
  /living|bedroom|study|balcony|room|ambient|outdoor|indoor|客厅|卧室|书房|次卧|阳台|室内|室外|环境/;
const LIGHTING_NEGATIVE_HINTS = /down.?light|light|lamp|灯|筒灯|照明/;
const ROUTER_POSITIVE_INTEGRATIONS =
  /openwrt|immortalwrt|tplink|tp_link|asuswrt|fritz|unifi|opnsense|pfsense|mikrotik|routeros/;
const ROUTER_POSITIVE_CONTEXT =
  /\brouter\b|openwrt|immortalwrt|tp[-_ ]?link|archer|deco|unifi|opnsense|pfsense|mikrotik|routeros|主路由|软路由|路由器|\bwan\b|\blan\b|client.?count|routing|internet traffic/;
const ROUTER_NEGATIVE_CONTEXT =
  /zigbee|bluetooth|\bble\b|matter|homekit|thread border router|smart home hub|gateway hub|mi gateway|xiaomi gateway|sensor hub|\bbridge\b|米家网关|智能家居网关/;

function airQualityCandidate(name: string, deviceClass: string, unit: string) {
  if (deviceClass === 'aqi' || /(?:^|[._ -])aqi(?:$|[._ -])|air quality|空气质量/.test(name))
    return candidate(HOME_OS_ROLES.environmentAirQuality, 0.96, 'device_metadata', 'AQI metadata');
  if (deviceClass === 'pm25' || /pm\s*2[._ ]?5|pm25/.test(name))
    return candidate(HOME_OS_ROLES.environmentPm25, 0.97, 'device_metadata', 'PM2.5 metadata');
  if (deviceClass === 'pm10' || /pm\s*10/.test(name))
    return candidate(HOME_OS_ROLES.environmentPm10, 0.97, 'device_metadata', 'PM10 metadata');
  if (
    deviceClass === 'carbon_dioxide' ||
    /(?:^|[._ -])co2(?:$|[._ -])|carbon dioxide|二氧化碳/.test(name)
  )
    return candidate(HOME_OS_ROLES.environmentCo2, 0.97, 'device_metadata', 'CO2 metadata');
  if (/formaldehyde|hcho|甲醛/.test(name))
    return candidate(
      HOME_OS_ROLES.environmentHcho,
      0.96,
      'device_metadata',
      'formaldehyde metadata'
    );
  if (/\btvoc\b|total volatile organic|总挥发性有机物/.test(name))
    return candidate(HOME_OS_ROLES.environmentTvoc, 0.96, 'device_metadata', 'TVOC metadata');
  if (
    deviceClass === 'volatile_organic_compounds' ||
    deviceClass === 'volatile_organic_compounds_parts' ||
    /(?:^|[._ -])voc(?:$|[._ -])|volatile organic|挥发性有机物/.test(name)
  )
    return candidate(HOME_OS_ROLES.environmentVoc, 0.95, 'device_metadata', 'VOC metadata');
  if (/µg\/m³|ug\/m3|μg\/m³|ppm|ppb/.test(unit) && /air|空气|quality|颗粒物/.test(name))
    return candidate(
      HOME_OS_ROLES.environmentAirQuality,
      0.72,
      'device_metadata',
      `air metric unit=${unit}`
    );
  return undefined;
}

function temperatureCandidate(
  name: string,
  entityCategory: string,
  hasRoomContext: boolean
): SemanticCandidate {
  if (REFRIGERATION_HINTS.test(name)) {
    return candidate(
      HOME_OS_ROLES.applianceRefrigerationTemperature,
      0.99,
      'device_metadata',
      'device_class=temperature',
      'refrigeration device context'
    );
  }
  if (entityCategory === 'diagnostic' || INTERNAL_DEVICE_HINTS.test(name)) {
    return candidate(
      HOME_OS_ROLES.deviceInternalTemperature,
      0.97,
      'device_metadata',
      'device_class=temperature',
      entityCategory === 'diagnostic' ? 'entity_category=diagnostic' : 'internal device context'
    );
  }
  const environmentalContext = hasRoomContext || ENVIRONMENT_HINTS.test(name);
  return candidate(
    HOME_OS_ROLES.environmentTemperature,
    environmentalContext ? 0.96 : 0.68,
    'device_metadata',
    'device_class=temperature',
    environmentalContext ? 'residential environment context' : 'environment context not confirmed'
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
  const pveIntegration = integration.includes('proxmox') || integration.includes('pve');
  const pvePattern = /(?:^|[._ -])(?:proxmox|pve|proxmoxve)(?:$|[._ -])/;
  const pveDeviceContext = pvePattern.test(
    [
      entity.attributes.deviceName,
      entity.attributes.device_name,
      entity.attributes.manufacturer,
      entity.attributes.model,
      entity.attributes.configEntry,
      entity.attributes.config_entry,
    ]
      .map(readString)
      .join(' ')
      .toLowerCase()
  );
  const pveContext = pveIntegration || pveDeviceContext || pvePattern.test(name);
  if (pveContext) {
    const compatibleRole = resolvePveCompatibleRole(entity, name);
    if (!compatibleRole) return result;
    result.push(
      candidate(
        compatibleRole,
        pveIntegration ? 0.99 : pveDeviceContext ? 0.94 : 0.82,
        pveIntegration ? 'integration' : pveDeviceContext ? 'device_metadata' : 'regex_fallback',
        pveIntegration
          ? `integration=${integration}`
          : pveDeviceContext
            ? 'device context=PVE'
            : 'PVE name candidate requires mapping review',
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
    if (LIGHTING_NEGATIVE_HINTS.test(name)) {
      result.unshift(
        candidate(HOME_OS_ROLES.lightingSwitch, 0.97, 'device_metadata', 'lighting switch context')
      );
    }
  } else if (domain === 'button' && LIGHTING_NEGATIVE_HINTS.test(name)) {
    result.push(
      candidate(HOME_OS_ROLES.lightingSwitch, 0.95, 'device_metadata', 'lighting button context')
    );
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
  } else if (domain === 'camera') {
    const role = resolveCameraCompatibleRole(entity);
    if (role) {
      result.push(
        candidate(
          role,
          role === HOME_OS_ROLES.diagnosticCamera ? 0.8 : 0.96,
          'device_metadata',
          role === HOME_OS_ROLES.diagnosticCamera
            ? 'camera domain without positive security evidence'
            : 'camera semantic compatibility evidence'
        )
      );
    }
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
    result.push(temperatureCandidate(name, entityCategory, Boolean(entity.room?.trim())));
  }
  const roleFromClass = deviceClassRoles[deviceClass];
  if (roleFromClass) {
    const hasLightingConflict =
      roleFromClass === HOME_OS_ROLES.securityDoor && LIGHTING_NEGATIVE_HINTS.test(name);
    result.push(
      candidate(
        roleFromClass,
        hasLightingConflict ? 0.65 : 0.96,
        'device_metadata',
        `device_class=${deviceClass}`,
        hasLightingConflict
          ? 'negative evidence: lighting device context conflicts with door semantics'
          : 'device context has no semantic conflict'
      )
    );
  }

  if (domain === 'sensor') {
    const airCandidate = airQualityCandidate(name, deviceClass, unit);
    if (airCandidate && !result.some(({ role }) => role === airCandidate.role))
      result.push(airCandidate);
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

  const routerNegative =
    ROUTER_NEGATIVE_CONTEXT.test(name) || ROUTER_NEGATIVE_CONTEXT.test(integration);
  const routerIntegration = ROUTER_POSITIVE_INTEGRATIONS.test(integration);
  const routerContext =
    !routerNegative && (routerIntegration || ROUTER_POSITIVE_CONTEXT.test(name));
  if (routerContext) {
    const role = resolveRouterCompatibleRole(entity, name);
    if (!role) return result.sort((left, right) => right.confidence - left.confidence);
    result.push(
      candidate(
        role,
        routerIntegration ? 0.97 : 0.9,
        routerIntegration ? 'integration' : 'device_metadata',
        routerIntegration ? `router integration=${integration}` : 'strong network router context',
        'negative smart-home gateway evidence absent'
      )
    );
  }

  const fallbackRules: Array<[RegExp, string]> = [
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
