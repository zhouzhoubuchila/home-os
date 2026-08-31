import type { DeviceWithType } from '@navet/app/types/device.types';

export type HomeOsSeverity = 'critical' | 'warning' | 'info';

export interface HomeOsMetric {
  id: string;
  label: string;
  value: string;
  unit: string;
  numericValue: number | null;
  available: boolean;
}

export interface HomeOsAttentionItem extends HomeOsMetric {
  severity: HomeOsSeverity;
  category: 'security' | 'battery' | 'consumable' | 'homelab' | 'availability';
}

export interface HomeOsModel {
  attention: HomeOsAttentionItem[];
  cameras: DeviceWithType[];
  energy: {
    electricity: HomeOsMetric[];
    gas: HomeOsMetric[];
    balance: HomeOsMetric[];
    tariff: HomeOsMetric[];
  };
  family: {
    people: DeviceWithType[];
    calendars: DeviceWithType[];
    vacuums: DeviceWithType[];
  };
  homelab: {
    pve: HomeOsMetric[];
    homeAssistant: HomeOsMetric[];
    network: HomeOsMetric[];
    internet: HomeOsMetric[];
  };
  rooms: Array<{ name: string; devices: number; active: number; alerts: number }>;
  scenes: DeviceWithType[];
}

const unavailableValues = new Set(['unknown', 'unavailable', 'none', 'null', '']);

function searchable(device: DeviceWithType): string {
  const source = device as DeviceWithType & {
    deviceClass?: string;
    entityType?: string;
    unit?: string;
    value?: string | number;
  };
  return `${device.id} ${device.name} ${device.room ?? ''} ${source.deviceClass ?? ''} ${source.entityType ?? ''}`.toLowerCase();
}

function readDeviceValue(device: DeviceWithType): string {
  if ('value' in device) return String(device.value ?? '');
  if ('state' in device) {
    if (typeof device.state === 'boolean') return device.state ? 'on' : 'off';
    return String(device.state ?? '');
  }
  if ('status' in device) return String(device.status ?? '');
  if ('location' in device) return String(device.location ?? '');
  return '';
}

function unitOf(device: DeviceWithType): string {
  return 'unit' in device && typeof device.unit === 'string' ? device.unit : '';
}

function numeric(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMetric(device: DeviceWithType): HomeOsMetric {
  const value = readDeviceValue(device);
  return {
    id: device.id,
    label: device.name,
    value,
    unit: unitOf(device),
    numericValue: numeric(value),
    available: !unavailableValues.has(value.trim().toLowerCase()),
  };
}

function matches(device: DeviceWithType, pattern: RegExp): boolean {
  return pattern.test(searchable(device));
}

function isActive(device: DeviceWithType): boolean {
  const value = readDeviceValue(device).toLowerCase();
  if (device.type === 'lights' || device.type === 'switches' || device.type === 'helpers') {
    return value === 'on';
  }
  return ['playing', 'cleaning', 'mopping', 'open', 'unlocked', 'home', 'heat', 'cool'].includes(
    value
  );
}

function buildAttention(devices: DeviceWithType[]): HomeOsAttentionItem[] {
  const items: HomeOsAttentionItem[] = [];
  for (const device of devices) {
    const metric = toMetric(device);
    const query = searchable(device);
    const value = metric.numericValue;
    const add = (severity: HomeOsSeverity, category: HomeOsAttentionItem['category']) =>
      items.push({ ...metric, severity, category });

    if (!metric.available) add('warning', 'availability');
    if (/battery|电池/.test(query) && value !== null && value <= 20) {
      add(value <= 10 ? 'critical' : 'warning', 'battery');
    }
    if (
      /filter|brush|consumable|life|滤芯|耗材|寿命/.test(query) &&
      value !== null &&
      value <= 15
    ) {
      add(value <= 5 ? 'critical' : 'warning', 'consumable');
    }
    if (
      /door|window|garage|opening|门|窗/.test(query) &&
      ['on', 'open'].includes(metric.value.toLowerCase())
    ) {
      add('warning', 'security');
    }
    if (
      /pve|proxmox|cpu|processor/.test(query) &&
      /temperature|温度/.test(query) &&
      value !== null &&
      value >= 75
    ) {
      add(value >= 85 ? 'critical' : 'warning', 'homelab');
    }
  }
  const rank: Record<HomeOsSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return items.sort((left, right) => rank[left.severity] - rank[right.severity]);
}

function uniqueMetrics(devices: DeviceWithType[], pattern: RegExp, limit = 12): HomeOsMetric[] {
  return devices
    .filter((device) => matches(device, pattern))
    .slice(0, limit)
    .map(toMetric);
}

export function buildHomeOsModel(deviceMap: Map<string, DeviceWithType>): HomeOsModel {
  const devices = [...deviceMap.values()];
  const attention = buildAttention(devices);
  const attentionIds = new Set(attention.map((item) => item.id));
  const roomMap = new Map<string, DeviceWithType[]>();
  for (const device of devices) {
    const room = device.room?.trim() || 'Unassigned';
    const current = roomMap.get(room) ?? [];
    current.push(device);
    roomMap.set(room, current);
  }

  return {
    attention,
    cameras: devices.filter((device) => device.type === 'cameras'),
    energy: {
      electricity: uniqueMetrics(devices, /state.?grid|国家电网|electric|power|energy|电量|电费/),
      gas: uniqueMetrics(devices, /towngas|shandong|港华|gas|燃气|用气/),
      balance: uniqueMetrics(devices, /balance|credit|remaining|余额|剩余/),
      tariff: uniqueMetrics(devices, /tariff|peak|valley|off.?peak|峰|谷|阶梯/),
    },
    family: {
      people: devices.filter((device) => device.type === 'persons'),
      calendars: devices.filter((device) => device.type === 'calendars'),
      vacuums: devices.filter((device) => device.type === 'vacuums'),
    },
    homelab: {
      pve: uniqueMetrics(devices, /pve|proxmox/),
      homeAssistant: uniqueMetrics(devices, /home.?assistant|hass|supervisor/),
      network: uniqueMetrics(
        devices,
        /immortalwrt|openwrt|router|gateway|switch|ap|deco|路由|网关/
      ),
      internet: uniqueMetrics(
        devices,
        /internet|wan|ping|latency|jitter|packet.?loss|speedtest|公网|延迟|丢包/
      ),
    },
    rooms: [...roomMap.entries()]
      .map(([name, roomDevices]) => ({
        name,
        devices: roomDevices.length,
        active: roomDevices.filter(isActive).length,
        alerts: roomDevices.filter((device) => attentionIds.has(device.id)).length,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    scenes: devices.filter((device) => device.type === 'scenes'),
  };
}
