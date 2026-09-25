import { BATTERY_LEVEL_THRESHOLDS } from '@navet/app/features/dashboard/components/widgets/battery-constants';
import { readHomeAssistantBatterySensorLevel } from '@navet/app/infrastructure/home-assistant/home-assistant-battery-selectors';
import type { ResolvedSemanticEntity } from '../core/types';

export type DeviceHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';
export type DeviceHealthIssue =
  | 'unavailable'
  | 'critical-battery'
  | 'degraded'
  | 'low-battery'
  | 'unknown';
export interface DeviceHealthDevice {
  id: string;
  name: string;
  room?: string;
  providerId: string;
  state: DeviceHealthState;
  batteryLevel?: number;
  lowBattery: boolean;
  unavailableEntityCount: number;
  availableEntityCount: number;
  issues: DeviceHealthIssue[];
}
export interface DeviceHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unavailable: number;
  lowBattery: number;
  attention: number;
  unknown: number;
}
export interface DeviceHealthResolution {
  sourceOffline: boolean;
  devices: DeviceHealthDevice[];
  attention: DeviceHealthDevice[];
  summary: DeviceHealthSummary;
}

const excludedDomains =
  /^(?:sun|weather|calendar|person|zone|update|automation|scene|script|input_[a-z_]+|button|event|device_tracker)\./;
const excludedIntegrations = new Set([
  'systemmonitor',
  'speedtestdotnet',
  'speedtest',
  'ping',
  'template',
  'proxmoxve',
  'proxmox',
  'pve',
]);
const controlDomains = new Set([
  'light',
  'switch',
  'fan',
  'climate',
  'cover',
  'lock',
  'vacuum',
  'media_player',
  'camera',
  'humidifier',
  'water_heater',
  'select',
  'number',
]);
const supportClasses = new Set(['battery', 'signal_strength', 'linkquality', 'rssi', 'voltage']);
const issueOrder: Record<DeviceHealthIssue, number> = {
  unavailable: 0,
  'critical-battery': 1,
  degraded: 2,
  'low-battery': 3,
  unknown: 4,
};
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function isHouseholdEntity(item: ResolvedSemanticEntity): boolean {
  const entity = item.entity;
  const attributes = entity.attributes;
  if (item.ignored || item.displayMode === 'hidden' || entity.providerId !== 'home_assistant')
    return false;
  if (!text(attributes.deviceId ?? attributes.device_id)) return false;
  if (excludedDomains.test(entity.externalId)) return false;
  if (
    item.roles.some(
      (role) =>
        role.startsWith('homelab.') ||
        role.startsWith('network.') ||
        role.startsWith('weather.') ||
        role.startsWith('energy.')
    )
  )
    return false;
  const integration = text(attributes.integration ?? attributes.platform).toLowerCase();
  if (excludedIntegrations.has(integration)) return false;
  const identity =
    `${entity.externalId} ${text(attributes.deviceName)} ${text(attributes.model)}`.toLowerCase();
  if (/\b(?:speedtest|proxmox|system monitor|internet probe)\b/.test(identity)) return false;
  return true;
}

function isSupport(item: ResolvedSemanticEntity): boolean {
  const attributes = item.entity.attributes;
  const deviceClass = text(attributes.deviceClass ?? attributes.device_class).toLowerCase();
  return (
    text(attributes.entityCategory ?? attributes.entity_category) === 'diagnostic' ||
    supportClasses.has(deviceClass) ||
    item.roles.includes('diagnostic.battery')
  );
}

function connectivityState(item: ResolvedSemanticEntity): 'up' | 'down' | undefined {
  const deviceClass = text(
    item.entity.attributes.deviceClass ?? item.entity.attributes.device_class
  ).toLowerCase();
  if (
    deviceClass !== 'connectivity' &&
    !/\b(?:connectivity|reachable|online)\b/.test(
      item.entity.externalId.toLowerCase().replaceAll('_', ' ')
    )
  )
    return undefined;
  if (item.entity.availability !== 'available') return undefined;
  const state = String(item.entity.primaryState).toLowerCase();
  if (['off', 'false', 'disconnected', 'unreachable'].includes(state)) return 'down';
  if (['on', 'true', 'connected', 'reachable'].includes(state)) return 'up';
  return undefined;
}

export function resolveDeviceHealth(
  entities: readonly ResolvedSemanticEntity[],
  providerConnected: boolean | undefined
): DeviceHealthResolution {
  const groups = new Map<string, ResolvedSemanticEntity[]>();
  for (const item of entities) {
    if (!isHouseholdEntity(item)) continue;
    const id = `${item.entity.providerId}:${text(item.entity.attributes.deviceId ?? item.entity.attributes.device_id)}`;
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  const sourceOffline = providerConnected === false;
  const devices: DeviceHealthDevice[] = [];
  for (const [id, group] of groups) {
    const sorted = [...group].sort((a, b) =>
      a.entity.externalId.localeCompare(b.entity.externalId)
    );
    const primary = sorted.filter((item) => !isSupport(item));
    const core = primary.filter((item) => {
      const domain = item.entity.externalId.split('.')[0];
      return controlDomains.has(domain) || domain === 'sensor' || domain === 'binary_sensor';
    });
    const observed = core.length ? core : primary;
    const available = observed.filter((item) => item.entity.availability === 'available').length;
    const unavailable = observed.filter(
      (item) => item.entity.availability === 'unavailable'
    ).length;
    const down = group.some((item) => connectivityState(item) === 'down');
    let state: DeviceHealthState = 'unknown';
    if (!sourceOffline) {
      if (down || (observed.length && unavailable === observed.length)) state = 'unavailable';
      else if (unavailable > 0 && available > 0) state = 'degraded';
      else if (observed.length && available === observed.length) state = 'healthy';
    }
    const batteryLevels = group.flatMap((item) => {
      if (item.entity.availability !== 'available') return [];
      const level = readHomeAssistantBatterySensorLevel(
        item.entity.externalId,
        item.entity.primaryState,
        item.entity.attributes
      );
      return level === undefined ? [] : [level];
    });
    const batteryLevel = batteryLevels.length ? Math.min(...batteryLevels) : undefined;
    const lowBattery = batteryLevel !== undefined && batteryLevel <= BATTERY_LEVEL_THRESHOLDS.LOW;
    const issues: DeviceHealthIssue[] = [];
    if (state === 'unavailable') issues.push('unavailable');
    if (batteryLevel !== undefined && batteryLevel <= BATTERY_LEVEL_THRESHOLDS.CRITICAL)
      issues.push('critical-battery');
    else if (lowBattery) issues.push('low-battery');
    if (state === 'degraded') issues.push('degraded');
    if (state === 'unknown') issues.push('unknown');
    issues.sort((a, b) => issueOrder[a] - issueOrder[b]);
    devices.push({
      id,
      name:
        text(sorted[0].entity.attributes.deviceName) ||
        sorted[0].displayName ||
        sorted[0].entity.name,
      room: sorted.find((item) => item.room || item.entity.room)?.room ?? sorted[0].entity.room,
      providerId: sorted[0].entity.providerId,
      state,
      batteryLevel,
      lowBattery,
      availableEntityCount: available,
      unavailableEntityCount: unavailable,
      issues,
    });
  }
  devices.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const attention = sourceOffline
    ? []
    : devices
        .filter((device) => device.issues.length)
        .sort(
          (a, b) =>
            issueOrder[a.issues[0]] - issueOrder[b.issues[0]] ||
            (a.batteryLevel ?? 101) - (b.batteryLevel ?? 101) ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id)
        );
  const summary: DeviceHealthSummary = {
    total: devices.length,
    healthy: sourceOffline ? 0 : devices.filter((device) => device.issues.length === 0).length,
    degraded: sourceOffline ? 0 : devices.filter((device) => device.state === 'degraded').length,
    unavailable: sourceOffline
      ? 0
      : devices.filter((device) => device.state === 'unavailable').length,
    lowBattery: sourceOffline ? 0 : devices.filter((device) => device.lowBattery).length,
    attention: attention.length,
    unknown: sourceOffline
      ? devices.length
      : devices.filter((device) => device.state === 'unknown').length,
  };
  return { sourceOffline, devices, attention, summary };
}
