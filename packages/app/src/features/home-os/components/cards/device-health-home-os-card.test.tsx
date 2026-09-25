import { BATTERY_LEVEL_THRESHOLDS } from '@navet/app/features/dashboard/components/widgets/battery-constants';
import { describe, expect, it } from 'vitest';
import type { ResolvedSemanticEntity } from '../../core/types';
import {
  groupDeviceHealthDetail,
  resolveDeviceHealth,
} from '../../resolution/device-health-resolution';
import { homeOsEntity } from '../../tests/fixtures';
import { deviceHealthSizeKind } from './device-health-home-os-card';

function entity(
  id: string,
  deviceId = 'device-1',
  options: {
    state?: string | number;
    availability?: 'available' | 'unavailable' | 'unknown';
    deviceClass?: string;
    entityCategory?: string;
    integration?: string;
    deviceName?: string;
    roles?: string[];
  } = {}
): ResolvedSemanticEntity {
  return {
    entity: homeOsEntity({
      externalId: id,
      name: id,
      primaryState: options.state ?? 'on',
      availability: options.availability ?? 'available',
      attributes: {
        deviceId,
        deviceName: options.deviceName ?? deviceId,
        deviceClass: options.deviceClass,
        entityCategory: options.entityCategory,
        integration: options.integration,
      },
    }),
    candidates: [],
    roles: options.roles ?? [],
    confidence: 1,
    reasons: [],
    source: 'manual',
    displayName: id,
    displayMode: 'primary',
    controlPolicy: 'readonly',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  };
}

describe('device health resolution', () => {
  it('counts four entities as one device and groups by deviceId', () => {
    const result = resolveDeviceHealth(
      [
        entity('sensor.temperature'),
        entity('sensor.humidity'),
        entity('sensor.battery', 'device-1', { deviceClass: 'battery', state: 87 }),
        entity('sensor.signal', 'device-1', { entityCategory: 'diagnostic' }),
      ],
      true
    );
    expect(result.summary.total).toBe(1);
    expect(result.devices[0].availableEntityCount).toBe(2);
    expect(result.summary.healthy).toBe(1);
  });

  it('attaches the lowest battery reading once to its device', () => {
    const result = resolveDeviceHealth(
      [
        entity('light.lamp'),
        entity('sensor.battery_a', 'device-1', { deviceClass: 'battery', state: 35 }),
        entity('sensor.battery_b', 'device-1', { deviceClass: 'battery', state: 19 }),
      ],
      true
    );
    expect(result.summary.lowBattery).toBe(1);
    expect(result.attention).toHaveLength(1);
    expect(result.devices[0].batteryLevel).toBe(19);
  });

  it('does not mark a device offline for diagnostic failure', () => {
    const result = resolveDeviceHealth(
      [
        entity('switch.plug'),
        entity('sensor.signal', 'device-1', {
          entityCategory: 'diagnostic',
          availability: 'unavailable',
        }),
      ],
      true
    );
    expect(result.devices[0].state).toBe('healthy');
  });

  it('keeps appliance unavailability based on core entities, not device name', () => {
    const result = resolveDeviceHealth(
      [
        entity('switch.washer', 'washer', {
          availability: 'unavailable',
          deviceName: 'Washing machine',
        }),
        entity('sensor.washer_signal', 'washer', {
          entityCategory: 'diagnostic',
          availability: 'available',
        }),
      ],
      true
    );
    expect(result.devices[0].state).toBe('unavailable');
    expect(result.attention[0].issues[0]).toBe('unavailable');
  });

  it('marks all unavailable core entities unavailable and partial failures degraded', () => {
    const offline = resolveDeviceHealth(
      [
        entity('sensor.temperature', 'device-1', { availability: 'unavailable' }),
        entity('sensor.humidity', 'device-1', { availability: 'unavailable' }),
      ],
      true
    );
    const partial = resolveDeviceHealth(
      [
        entity('sensor.temperature', 'device-1', { availability: 'unavailable' }),
        entity('sensor.humidity'),
      ],
      true
    );
    expect(offline.devices[0].state).toBe('unavailable');
    expect(partial.devices[0].state).toBe('degraded');
  });

  it('honors an explicit connectivity sensor but not mere available state as ONLINE', () => {
    const result = resolveDeviceHealth(
      [
        entity('light.lamp'),
        entity('binary_sensor.connectivity', 'device-1', {
          deviceClass: 'connectivity',
          state: 'off',
        }),
      ],
      true
    );
    expect(result.devices[0].state).toBe('unavailable');
  });

  it('keeps source failure separate from individual device failure', () => {
    const result = resolveDeviceHealth(
      [entity('light.a', 'a'), entity('light.b', 'b', { availability: 'unavailable' })],
      false
    );
    expect(result.sourceOffline).toBe(true);
    expect(result.summary.unavailable).toBe(0);
    expect(result.summary.unknown).toBe(2);
    expect(result.attention).toHaveLength(0);
  });

  it('excludes helpers, calendar, weather, system monitor and entities without deviceId', () => {
    const result = resolveDeviceHealth(
      [
        entity('input_boolean.helper', 'a'),
        entity('calendar.family', 'b'),
        entity('weather.home', 'c'),
        entity('sensor.cpu', 'd', { integration: 'systemmonitor' }),
        entity('sensor.speedtest_download', 'e', { integration: 'speedtestdotnet' }),
        entity('sensor.no_registry_device', ''),
        entity('light.lamp', 'f'),
      ],
      true
    );
    expect(result.devices.map((device) => device.id)).toEqual(['home_assistant:f']);
  });

  it('excludes an entire router device when one entity has a network role', () => {
    const result = resolveDeviceHealth(
      [
        entity('binary_sensor.tl_7dr7230_online', 'router', { roles: ['network.router.online'] }),
        entity('sensor.tl_7dr7230_signal', 'router', {
          entityCategory: 'diagnostic',
          availability: 'unavailable',
        }),
        entity('light.lamp', 'lamp'),
      ],
      true
    );
    expect(result.devices.map((device) => device.id)).toEqual(['home_assistant:lamp']);
  });

  it('excludes TL-7DR7230 by its router integration without relying on every entity role', () => {
    const result = resolveDeviceHealth(
      [
        entity('sensor.tl_7dr7230_clients', 'router', {
          integration: 'tplink_router',
          deviceName: 'TL-7DR7230',
        }),
        entity('sensor.tl_7dr7230_signal', 'router', {
          entityCategory: 'diagnostic',
          deviceName: 'TL-7DR7230',
        }),
      ],
      true
    );
    expect(result.summary.total).toBe(0);
  });

  it('excludes Sun by integration even when its entity domain is sensor', () => {
    const result = resolveDeviceHealth(
      [
        entity('sensor.next_sunrise', 'sun-device', { integration: 'sun', deviceName: 'Sun' }),
        entity('sensor.next_dusk', 'sun-device', { deviceName: 'Sun' }),
      ],
      true
    );
    expect(result.summary.total).toBe(0);
  });

  it('excludes a logical Sun group but does not discard an appliance for its update entity', () => {
    const result = resolveDeviceHealth(
      [
        entity('sun.sun', 'sun-device'),
        entity('sensor.next_sunrise', 'sun-device'),
        entity('update.washer_firmware', 'washer'),
        entity('switch.washer', 'washer'),
      ],
      true
    );
    expect(result.devices.map((device) => device.id)).toEqual(['home_assistant:washer']);
  });

  it('excludes template-only logical devices', () => {
    const result = resolveDeviceHealth(
      [
        entity('sensor.template_status', 'logical', { integration: 'template' }),
        entity('sensor.template_value', 'logical', { integration: 'template' }),
      ],
      true
    );
    expect(result.summary.total).toBe(0);
  });

  it('does not count unknown as healthy', () => {
    const result = resolveDeviceHealth(
      [entity('light.lamp', 'a', { availability: 'unknown' })],
      true
    );
    expect(result.summary.healthy).toBe(0);
    expect(result.summary.unknown).toBe(1);
    expect(result.summary.attention).toBe(0);
    expect(result.attention).toHaveLength(0);
    expect(groupDeviceHealthDetail(result).unknown).toHaveLength(1);
  });

  it('puts unknown with 23% battery only in Needs Attention', () => {
    const result = resolveDeviceHealth(
      [
        entity('switch.appliance', 'appliance', { availability: 'unknown' }),
        entity('sensor.appliance_battery', 'appliance', { deviceClass: 'battery', state: 23 }),
      ],
      true
    );
    const groups = groupDeviceHealthDetail(result);
    expect(result.summary.attention).toBe(1);
    expect(result.summary.unknown).toBe(0);
    expect(groups.attention).toHaveLength(1);
    expect(groups.attention[0].issues).toEqual(['low-battery']);
    expect(groups.unknown).toHaveLength(0);
  });

  it('deduplicates degraded and low battery, prioritizing degraded', () => {
    const result = resolveDeviceHealth(
      [
        entity('sensor.temperature', 'sensor-device'),
        entity('sensor.humidity', 'sensor-device', { availability: 'unavailable' }),
        entity('sensor.battery', 'sensor-device', { deviceClass: 'battery', state: 23 }),
      ],
      true
    );
    expect(result.attention).toHaveLength(1);
    expect(result.attention[0].issues).toEqual(['degraded', 'low-battery']);
    expect(groupDeviceHealthDetail(result).attention).toHaveLength(1);
  });

  it('keeps a registered battery-only device unknown rather than inventing connectivity', () => {
    const result = resolveDeviceHealth(
      [entity('sensor.battery', 'battery-only', { deviceClass: 'battery', state: 82 })],
      true
    );
    expect(result.summary.total).toBe(1);
    expect(result.summary.unknown).toBe(1);
    expect(result.summary.healthy).toBe(0);
  });

  it('uses an independent medium recipe', () => {
    expect(deviceHealthSizeKind('medium')).toBe('medium');
    expect(deviceHealthSizeKind('large')).toBe('large');
    expect(deviceHealthSizeKind('small')).toBe('small');
  });

  it('sorts attention by unavailable, critical battery, degraded, low battery and stable name', () => {
    const result = resolveDeviceHealth(
      [
        entity('light.low', 'low', { deviceName: 'Low' }),
        entity('sensor.low_battery', 'low', { deviceClass: 'battery', state: 35 }),
        entity('light.critical', 'critical', { deviceName: 'Critical' }),
        entity('sensor.critical_battery', 'critical', { deviceClass: 'battery', state: 5 }),
        entity('light.offline', 'offline', { availability: 'unavailable', deviceName: 'Offline' }),
        entity('light.degraded', 'degraded', { deviceName: 'Degraded' }),
        entity('sensor.degraded', 'degraded', { availability: 'unavailable' }),
      ],
      true
    );
    expect(result.attention.map((device) => device.id)).toEqual([
      'home_assistant:offline',
      'home_assistant:critical',
      'home_assistant:degraded',
      'home_assistant:low',
    ]);
  });

  it('shows a device with multiple issues only once', () => {
    const result = resolveDeviceHealth(
      [
        entity('light.offline', 'a', { availability: 'unavailable' }),
        entity('sensor.battery', 'a', { deviceClass: 'battery', state: 5 }),
      ],
      true
    );
    expect(result.attention).toHaveLength(1);
    expect(result.attention[0].issues).toEqual(['unavailable', 'critical-battery']);
  });

  it('shares Battery Overview thresholds, including boundaries', () => {
    const critical = resolveDeviceHealth(
      [
        entity('light.a'),
        entity('sensor.battery', 'device-1', {
          deviceClass: 'battery',
          state: BATTERY_LEVEL_THRESHOLDS.CRITICAL,
        }),
      ],
      true
    );
    const low = resolveDeviceHealth(
      [
        entity('light.a'),
        entity('sensor.battery', 'device-1', {
          deviceClass: 'battery',
          state: BATTERY_LEVEL_THRESHOLDS.LOW,
        }),
      ],
      true
    );
    expect(critical.attention[0].issues).toContain('critical-battery');
    expect(low.attention[0].issues).toContain('low-battery');
  });
});
