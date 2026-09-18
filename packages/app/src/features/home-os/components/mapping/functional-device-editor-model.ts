import { HOME_OS_ROLES } from '../../core/semantic-roles';
import type {
  HomeOsFunctionalDevice,
  HomeOsFunctionalDeviceKind,
  ResolvedSemanticEntity,
} from '../../core/types';

export const FUNCTIONAL_DEVICE_METRICS: Partial<
  Record<HomeOsFunctionalDeviceKind, readonly string[]>
> = {
  light: ['power', 'voltage'],
  pve: ['online', 'cpu', 'temperature', 'memory', 'storage', 'uptime'],
  router: [
    'online',
    'cpu',
    'memory',
    'temperature',
    'wan_ip',
    'lan_ip',
    'clients',
    'uptime',
    'upload',
    'download',
  ],
  internet: ['online', 'latency', 'packet_loss', 'jitter', 'download', 'upload'],
  server: ['online', 'version', 'cpu', 'memory', 'uptime'],
  energy_meter: ['today', 'month', 'balance', 'power'],
  gas_account: ['today', 'month', 'balance', 'account_status'],
  air_quality: ['aqi', 'pm25', 'pm10', 'co2', 'voc', 'temperature', 'humidity'],
  person: ['phone_tracker', 'additional_tracker'],
};

export const CONTROLLABLE_DEVICE_KINDS = new Set<HomeOsFunctionalDeviceKind>([
  'light',
  'switch',
  'fan',
  'outlet',
]);

export const FUNCTIONAL_DEVICE_METRIC_LABELS: Record<string, { en: string; zh: string }> = {
  online: { en: 'Online status', zh: '在线状态' },
  cpu: { en: 'CPU usage', zh: 'CPU 使用率' },
  temperature: { en: 'Temperature', zh: '温度' },
  memory: { en: 'Memory usage', zh: '内存使用率' },
  storage: { en: 'Storage usage', zh: '存储使用率' },
  uptime: { en: 'Uptime', zh: '运行时间' },
  power: { en: 'Power', zh: '功率' },
  voltage: { en: 'Voltage', zh: '电压' },
  version: { en: 'Version', zh: '版本' },
  wan_ip: { en: 'WAN IP', zh: 'WAN IP' },
  lan_ip: { en: 'LAN IP', zh: 'LAN IP' },
  clients: { en: 'Connected clients', zh: '连接客户端' },
  upload: { en: 'Upload', zh: '上传' },
  download: { en: 'Download', zh: '下载' },
  latency: { en: 'Latency', zh: '延迟' },
  packet_loss: { en: 'Packet loss', zh: '丢包率' },
  jitter: { en: 'Jitter', zh: '抖动' },
  today: { en: 'Today', zh: '今日用量' },
  month: { en: 'This month', zh: '本月用量' },
  balance: { en: 'Balance', zh: '账户余额' },
  account_status: { en: 'Account status', zh: '账户状态' },
  aqi: { en: 'Air quality index', zh: '空气质量指数' },
  pm25: { en: 'PM2.5', zh: 'PM2.5' },
  pm10: { en: 'PM10', zh: 'PM10' },
  co2: { en: 'CO₂', zh: '二氧化碳' },
  voc: { en: 'VOC', zh: '挥发性有机物' },
  humidity: { en: 'Humidity', zh: '湿度' },
  phone_tracker: { en: 'Phone tracker', zh: '手机定位' },
  additional_tracker: { en: 'Additional tracker', zh: '其他定位' },
};

const PVE_METRIC_ROLES: Record<string, readonly string[]> = {
  online: [HOME_OS_ROLES.homelabPveOnline, HOME_OS_ROLES.homelabPveStatus],
  cpu: [HOME_OS_ROLES.homelabPveCpu],
  temperature: [HOME_OS_ROLES.homelabPveTemperature],
  memory: [HOME_OS_ROLES.homelabPveMemory],
  storage: [HOME_OS_ROLES.homelabPveStorage],
  uptime: [HOME_OS_ROLES.homelabPveUptime],
};

export interface FunctionalDeviceEditorDraft {
  name: string;
  room: string;
  kind: HomeOsFunctionalDeviceKind;
  stateEntityId: string;
  turnOnEntityId: string;
  turnOffEntityId: string;
  toggleEntityId: string;
  triggerEntityId: string;
  metrics: Record<string, string>;
}

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function integrationOf(item: ResolvedSemanticEntity) {
  return readString(
    item.entity.attributes.integration ?? item.entity.attributes.platform
  ).toLowerCase();
}

function registryIdentityOf(item: ResolvedSemanticEntity) {
  const attributes = item.entity.attributes;
  return (
    readString(attributes.deviceId ?? attributes.device_id) ||
    readString(attributes.deviceName ?? attributes.device_name)
  );
}

function registryNameOf(item: ResolvedSemanticEntity) {
  const attributes = item.entity.attributes;
  return readString(attributes.deviceName ?? attributes.device_name);
}

function hasRolePrefix(item: ResolvedSemanticEntity, prefix: string) {
  return item.roles.some((role) => role.startsWith(prefix));
}

function allHaveRolePrefix(items: readonly ResolvedSemanticEntity[], prefix: string) {
  return items.length > 0 && items.every((item) => hasRolePrefix(item, prefix));
}

function sharedRegistryIdentity(items: readonly ResolvedSemanticEntity[]) {
  const identities = new Set(items.map(registryIdentityOf).filter(Boolean));
  return identities.size === 1 ? [...identities][0] : undefined;
}

export function normalizeFunctionalDeviceRoom(value: string | undefined) {
  const room = value?.trim() ?? '';
  return /^(unassigned|room not assigned|未分配|未分配房间)$/i.test(room) ? '' : room;
}

export function inferFunctionalDeviceKind(
  selected: readonly ResolvedSemanticEntity[]
): HomeOsFunctionalDeviceKind {
  if (!selected.length) return 'other';

  const domains = new Set(selected.map((item) => item.entity.externalId.split('.')[0]));
  if (
    [...domains].every((domain) => domain === 'person' || domain === 'device_tracker') &&
    selected.filter((item) => item.entity.externalId.startsWith('person.')).length === 1
  ) {
    return 'person';
  }

  if (
    selected.some((item) => hasRolePrefix(item, 'network.router.')) &&
    selected.every(
      (item) =>
        hasRolePrefix(item, 'network.router.') ||
        item.entity.externalId.startsWith('binary_sensor.')
    )
  ) {
    return 'router';
  }

  const sharedRegistry = sharedRegistryIdentity(selected);
  const allPveIntegration = selected.every((item) => /proxmox|pve/.test(integrationOf(item)));
  const coherentPveSelection = selected.length === 1 || Boolean(sharedRegistry);
  if (coherentPveSelection && (allHaveRolePrefix(selected, 'homelab.pve.') || allPveIntegration)) {
    return 'pve';
  }

  const semanticKinds: Array<[string, HomeOsFunctionalDeviceKind]> = [
    ['network.router.', 'router'],
    ['network.internet.', 'internet'],
    ['energy.electricity.', 'energy_meter'],
    ['energy.gas.', 'gas_account'],
    ['environment.air_quality.', 'air_quality'],
    ['family.person', 'person'],
    ['lighting.', 'light'],
  ];
  const semanticKind = semanticKinds.find(([prefix]) => allHaveRolePrefix(selected, prefix));
  if (semanticKind) return semanticKind[1];

  if (domains.size === 1) {
    const domain = [...domains][0];
    if (domain === 'light' || domain === 'switch' || domain === 'fan') return domain;
  }
  return 'other';
}

function looksLikeRouterOnline(item: ResolvedSemanticEntity) {
  if (item.roles.includes(HOME_OS_ROLES.networkRouterOnline)) return true;
  if (!item.entity.externalId.startsWith('binary_sensor.')) return false;
  const attributes = item.entity.attributes;
  const text = [
    item.entity.externalId,
    item.displayName,
    integrationOf(item),
    readString(attributes.deviceClass ?? attributes.device_class),
    readString(attributes.originalName ?? attributes.original_name),
  ]
    .join(' ')
    .toLowerCase();
  return /online|ping|connectivity|reachable|reachability|在线|连通|可达/.test(text);
}

function inferRouterStateEntity(selected: readonly ResolvedSemanticEntity[]) {
  const explicit = selected.filter((item) =>
    item.roles.includes(HOME_OS_ROLES.networkRouterOnline)
  );
  if (explicit.length === 1) return explicit[0];
  const onlineBinarySensors = selected.filter(looksLikeRouterOnline);
  if (onlineBinarySensors.length === 1) return onlineBinarySensors[0];
  const binarySensors = selected.filter((item) =>
    item.entity.externalId.startsWith('binary_sensor.')
  );
  return binarySensors.length === 1 ? binarySensors[0] : undefined;
}

function inferPersonMetrics(selected: readonly ResolvedSemanticEntity[]) {
  const trackers = selected.filter((item) => item.entity.externalId.startsWith('device_tracker.'));
  const phoneCandidates = trackers.filter((item) => integrationOf(item) === 'mobile_app');
  const phone = phoneCandidates.length === 1 ? phoneCandidates[0] : undefined;
  const additionalCandidates = trackers.filter((item) => integrationOf(item) !== 'mobile_app');
  const additional = additionalCandidates.length === 1 ? additionalCandidates[0] : undefined;
  return {
    ...(phone ? { phone_tracker: phone.entity.externalId } : {}),
    ...(additional ? { additional_tracker: additional.entity.externalId } : {}),
  };
}

function chooseUniqueRoleCandidate(
  preferred: readonly ResolvedSemanticEntity[],
  related: readonly ResolvedSemanticEntity[],
  roles: readonly string[]
) {
  const candidatesIn = (items: readonly ResolvedSemanticEntity[]) =>
    items.filter((item) => item.roles.some((role) => roles.includes(role)));
  const preferredCandidates = candidatesIn(preferred);
  if (preferredCandidates.length === 1) return preferredCandidates[0];
  if (preferredCandidates.length > 1) return undefined;
  const relatedCandidates = candidatesIn(related);
  return relatedCandidates.length === 1 ? relatedCandidates[0] : undefined;
}

function inferPveMetrics(
  selected: readonly ResolvedSemanticEntity[],
  entities: readonly ResolvedSemanticEntity[]
) {
  const identity = sharedRegistryIdentity(selected);
  const related = identity ? entities.filter((item) => registryIdentityOf(item) === identity) : [];
  return Object.fromEntries(
    Object.entries(PVE_METRIC_ROLES).flatMap(([metric, roles]) => {
      const candidate = chooseUniqueRoleCandidate(selected, related, roles);
      return candidate ? [[metric, candidate.entity.externalId]] : [];
    })
  );
}

function inferredPveName(selected: readonly ResolvedSemanticEntity[]) {
  const registryName = selected.map(registryNameOf).find(Boolean) ?? '';
  const nodeName = registryName.match(/^(?:\d+\.\s*)?node:\s*(.+)$/i)?.[1]?.trim();
  const inferred = nodeName || registryName;
  return /^pve$/i.test(inferred) ? 'PVE' : inferred || 'PVE';
}

export function createFunctionalDeviceEditorDraft(
  existing: HomeOsFunctionalDevice | undefined,
  entities: readonly ResolvedSemanticEntity[],
  initialEntityIds: readonly string[]
): FunctionalDeviceEditorDraft {
  if (existing) {
    return {
      name: existing.name,
      room: normalizeFunctionalDeviceRoom(existing.room),
      kind: existing.kind,
      stateEntityId: existing.stateEntityId ?? '',
      turnOnEntityId: existing.controls?.on ?? '',
      turnOffEntityId: existing.controls?.off ?? '',
      toggleEntityId: existing.controls?.toggle ?? '',
      triggerEntityId: existing.controls?.trigger ?? '',
      metrics: { ...existing.metrics },
    };
  }

  const entityById = new Map(entities.map((item) => [item.entity.externalId, item]));
  const selected = initialEntityIds
    .map((entityId) => entityById.get(entityId))
    .filter((item): item is ResolvedSemanticEntity => Boolean(item));
  const primary = selected[0];
  const kind = inferFunctionalDeviceKind(selected);
  const control = selected.find((item) => /^(light|switch|button)\./.test(item.entity.externalId));
  const metrics: Record<string, string> =
    kind === 'pve'
      ? inferPveMetrics(selected, entities)
      : kind === 'person'
        ? inferPersonMetrics(selected)
        : {};
  const onlineEntityId = metrics.online ?? '';
  const routerStateEntity = kind === 'router' ? inferRouterStateEntity(selected) : undefined;
  const personStateEntity =
    kind === 'person'
      ? selected.find((item) => item.entity.externalId.startsWith('person.'))
      : undefined;

  return {
    name: kind === 'pve' ? inferredPveName(selected) : (primary?.displayName ?? ''),
    room: normalizeFunctionalDeviceRoom(primary?.room),
    kind,
    stateEntityId:
      onlineEntityId ||
      routerStateEntity?.entity.externalId ||
      personStateEntity?.entity.externalId ||
      control?.entity.externalId ||
      primary?.entity.externalId ||
      '',
    turnOnEntityId: '',
    turnOffEntityId: '',
    toggleEntityId: '',
    triggerEntityId: '',
    metrics,
  };
}
