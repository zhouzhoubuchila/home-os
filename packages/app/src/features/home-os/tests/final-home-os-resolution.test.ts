import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { buildFamilyMembers } from '../adapters/family-adapter';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type {
  HomeOsFunctionalDevice,
  HomeOsPhysicalDevice,
  ManualEntityMapping,
} from '../core/types';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import {
  functionalDeviceMetricRows,
  ROUTER_METRIC_ORDER,
  resolveFinalDashboardDeviceMap,
  resolveFinalFunctionalDevices,
  resolveFinalPveDevices,
  resolveFunctionalOnlineState,
} from '../resolution/final-home-os-resolution';
import { homeOsEntity } from './fixtures';

const functional = (
  overrides: Partial<HomeOsFunctionalDevice> & Pick<HomeOsFunctionalDevice, 'kind'>
): HomeOsFunctionalDevice => ({
  id: `functional:${overrides.kind}`,
  name: overrides.kind,
  metrics: {},
  sourceEntityIds: [],
  ...overrides,
});

const manualLight: ManualEntityMapping = {
  schemaVersion: 2,
  entityId: 'switch.study',
  semanticRoles: [HOME_OS_ROLES.lightingSwitch],
  displayName: 'Manual study light',
  roomOverride: 'Study',
  source: 'manual',
  updatedAt: '2026-09-19T00:00:00.000Z',
};

const rawSwitch = {
  id: 'home_assistant:switch.study',
  canonicalId: 'home_assistant:switch.study',
  nativeId: 'switch.study',
  providerId: 'home_assistant',
  name: 'Xiaomi panel switch',
  room: 'Study',
  size: 'medium',
  state: false,
  type: 'switches',
} as DeviceWithType;

describe('final Home OS resolution', () => {
  it('looks up state, controls, and metrics by external or canonical id', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'binary_sensor.router', primaryState: 'on' }),
      homeOsEntity({ externalId: 'sensor.clients', primaryState: 27 }),
    ]);
    const [device] = resolveFinalFunctionalDevices(entities, [
      functional({
        kind: 'router',
        stateEntityId: 'home_assistant:binary_sensor.router',
        controls: { toggle: 'binary_sensor.router' },
        metrics: { clients: 'sensor.clients' },
        sourceEntityIds: ['binary_sensor.router'],
      }),
    ]);
    expect(device?.stateEntity?.entity.externalId).toBe('binary_sensor.router');
    expect(device?.controlEntities.toggle?.entity.externalId).toBe('binary_sensor.router');
    expect(device?.metricEntities.clients?.entity.primaryState).toBe(27);
  });

  it('applies functional > manual semantic > raw priority to a room switch without changing its control id', () => {
    const entities = resolveSemanticEntities(
      [homeOsEntity({ externalId: 'switch.study', name: 'Raw switch', primaryState: 'on' })],
      [manualLight]
    );
    const room = resolveFinalDashboardDeviceMap(new Map([[rawSwitch.id, rawSwitch]]), entities, [
      functional({
        kind: 'light',
        name: '书房灯',
        room: '书房',
        stateEntityId: 'switch.study',
        controls: { on: 'switch.study', off: 'switch.study' },
        sourceEntityIds: ['switch.study'],
      }),
    ]);
    expect(room.get(rawSwitch.id)).toMatchObject({
      id: rawSwitch.id,
      nativeId: 'switch.study',
      name: '书房灯',
      room: '书房',
      type: 'lights',
      state: true,
    });

    const manualOnly = resolveFinalDashboardDeviceMap(
      new Map([[rawSwitch.id, rawSwitch]]),
      entities,
      []
    );
    expect(manualOnly.get(rawSwitch.id)).toMatchObject({
      name: 'Manual study light',
      type: 'lights',
    });

    const rawOnly = resolveFinalDashboardDeviceMap(
      new Map([[rawSwitch.id, rawSwitch]]),
      resolveSemanticEntities([homeOsEntity({ externalId: 'switch.study', name: 'Raw switch' })]),
      []
    );
    expect(rawOnly.get(rawSwitch.id)).toEqual(rawSwitch);
  });

  it('re-resolves live entity state instead of retaining a static snapshot', () => {
    const config = [
      functional({
        kind: 'router',
        stateEntityId: 'binary_sensor.router',
        metrics: { online: 'binary_sensor.router' },
      }),
    ];
    const before = resolveFinalFunctionalDevices(
      resolveSemanticEntities([
        homeOsEntity({ externalId: 'binary_sensor.router', primaryState: 'off' }),
      ]),
      config
    );
    const after = resolveFinalFunctionalDevices(
      resolveSemanticEntities([
        homeOsEntity({ externalId: 'binary_sensor.router', primaryState: 'Excellent' }),
      ]),
      config
    );
    expect(resolveFunctionalOnlineState(before[0] as NonNullable<(typeof before)[0]>)).toBe(
      'offline'
    );
    expect(resolveFunctionalOnlineState(after[0] as NonNullable<(typeof after)[0]>)).toBe('online');
  });

  it('uses only exact functional PVE metrics in CPU-first order and falls back when absent', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'sensor.pve_status', primaryState: 'Good' }),
      homeOsEntity({ externalId: 'sensor.pve_cpu', primaryState: 8, attributes: { unit: '%' } }),
      homeOsEntity({ externalId: 'sensor.pve_temp', primaryState: 58, attributes: { unit: '°C' } }),
      homeOsEntity({ externalId: 'sensor.pve_memory', primaryState: 41 }),
      homeOsEntity({ externalId: 'sensor.pve_storage', primaryState: 17.66 }),
      homeOsEntity({ externalId: 'sensor.pve_uptime', primaryState: '4d' }),
      homeOsEntity({ externalId: 'sensor.pve_io_wait', primaryState: 2 }),
    ]);
    const resolved = resolveFinalFunctionalDevices(entities, [
      functional({
        kind: 'pve',
        name: 'PVE',
        metrics: {
          online: 'sensor.pve_status',
          cpu: 'sensor.pve_cpu',
          temperature: 'sensor.pve_temp',
          memory: 'sensor.pve_memory',
          storage: 'sensor.pve_storage',
          uptime: 'sensor.pve_uptime',
        },
      }),
    ]);
    const [pve] = resolveFinalPveDevices(resolved, []);
    expect(pve).toMatchObject({ name: 'PVE', room: undefined, state: 'online' });
    expect(Object.keys(pve?.semanticMetrics ?? {})).toEqual([
      HOME_OS_ROLES.homelabPveCpu,
      HOME_OS_ROLES.homelabPveTemperature,
      HOME_OS_ROLES.homelabPveMemory,
      HOME_OS_ROLES.homelabPveStorage,
      HOME_OS_ROLES.homelabPveUptime,
    ]);
    expect(pve?.entityIds).not.toContain('sensor.pve_io_wait');

    const automatic = [{ id: 'auto' } as HomeOsPhysicalDevice];
    expect(resolveFinalPveDevices([], automatic)).toEqual(automatic);
  });

  it('uses exact router bindings even when their automatic roles are diagnostic', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'binary_sensor.192_168_8_1', primaryState: 'Detected' }),
      homeOsEntity({ externalId: 'sensor.total_clients', primaryState: 27 }),
      homeOsEntity({ externalId: 'sensor.guest_clients', primaryState: 0 }),
      homeOsEntity({ externalId: 'sensor.main_clients', primaryState: 20 }),
      homeOsEntity({ externalId: 'sensor.wan', primaryState: '39.91.51.124' }),
      homeOsEntity({ externalId: 'sensor.lan', primaryState: '192.168.8.1' }),
    ]);
    const [router] = resolveFinalFunctionalDevices(entities, [
      functional({
        kind: 'router',
        name: '主路由',
        stateEntityId: 'binary_sensor.192_168_8_1',
        metrics: {
          online: 'binary_sensor.192_168_8_1',
          clients: 'sensor.total_clients',
          wan_ip: 'sensor.wan',
          lan_ip: 'sensor.lan',
        },
      }),
    ]);
    expect(resolveFunctionalOnlineState(router as NonNullable<typeof router>)).toBe('online');
    const rows = functionalDeviceMetricRows(
      router as NonNullable<typeof router>,
      ROUTER_METRIC_ORDER
    );
    expect(rows.map(({ key }) => key)).toEqual(['online', 'clients', 'wan_ip', 'lan_ip']);
    expect(rows.find(({ key }) => key === 'clients')?.entity.entity.primaryState).toBe(27);
    expect(rows.find(({ key }) => key === 'wan_ip')?.entity.entity.primaryState).toBe(
      '39.91.51.124'
    );
    expect(rows.find(({ key }) => key === 'lan_ip')?.entity.entity.primaryState).toBe(
      '192.168.8.1'
    );
    expect(rows.some(({ key }) => key === 'cpu' || key === 'memory')).toBe(false);
  });

  it('uses the person state entity as truth and attaches exact trackers without extra members', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'person.li_li', name: '粒粒', primaryState: 'home' }),
      homeOsEntity({
        externalId: 'device_tracker.li_li_lily',
        name: '粒粒Lily',
        primaryState: 'away',
        attributes: { platform: 'mobile_app' },
      }),
      homeOsEntity({
        externalId: 'device_tracker.iphone',
        name: 'iPhone',
        primaryState: 'home',
        attributes: { platform: 'tplink_router' },
      }),
    ]);
    const members = buildFamilyMembers(entities, [
      functional({
        kind: 'person',
        name: '粒粒',
        stateEntityId: 'person.li_li',
        metrics: {
          phone_tracker: 'device_tracker.li_li_lily',
          additional_tracker: 'device_tracker.iphone',
        },
      }),
    ]);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ personEntityId: 'person.li_li', state: 'home' });
    expect(members[0]?.trackerSources).toEqual([
      expect.objectContaining({ name: '粒粒Lily', platform: 'mobile_app', state: 'away' }),
      expect.objectContaining({ name: 'iPhone', platform: 'tplink_router', state: 'home' }),
    ]);
  });

  it('keeps legacy person/tracker association when no person functional device exists', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'device_tracker.alex_phone',
      semanticRoles: [HOME_OS_ROLES.familyTracker],
      familyPersonId: 'person.alex',
      source: 'manual',
      updatedAt: '2026-09-19T00:00:00.000Z',
    };
    const members = buildFamilyMembers(
      resolveSemanticEntities(
        [
          homeOsEntity({ externalId: 'person.alex', name: 'Alex', primaryState: 'home' }),
          homeOsEntity({ externalId: 'device_tracker.alex_phone', name: 'Alex phone' }),
        ],
        [mapping]
      ),
      []
    );
    expect(members).toHaveLength(1);
    expect(members[0]?.trackerEntityIds).toEqual(['device_tracker.alex_phone']);
  });
});
