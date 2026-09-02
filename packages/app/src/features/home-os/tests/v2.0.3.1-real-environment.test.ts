import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { getClimateDashboardGroup } from '../../climate/utils/climate-dashboard-group';
import { discoverBathHeaterFunctionalDevices } from '../adapters/functional-device-adapter';
import { buildHomeOsLights, getWholeHomeLightActions } from '../adapters/lighting-adapter';
import { getAstronomySnapshot } from '../astronomy/astronomy-visual';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveMetric } from '../mapping/metric-resolution';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

const manual = (entityId: string, role: string): ManualEntityMapping => ({
  schemaVersion: 2,
  entityId,
  semanticRoles: [role],
  source: 'manual',
  updatedAt: '2026-09-02T00:00:00.000Z',
});

describe('Home OS V2.0.3.1 real environment regressions', () => {
  it('discovers the real PVE CPU temperature without an integration attribute', () => {
    const [resolved] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.1_node_pve_cpu_temperature',
        room: undefined,
        primaryState: 61,
        attributes: { deviceName: 'PVE Node 1', manufacturer: 'Proxmox', unit: '°C' },
      }),
    ]);
    expect(resolved?.roles).toContain(HOME_OS_ROLES.homelabPveTemperature);
  });

  it('reports no_candidate_found only when discovery found nothing', () => {
    expect(resolveMetric('missing.role', []).reasonCode).toBe('no_candidate_found');
  });

  it('reports candidate_unmapped for a review candidate', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.unknown_temperature',
        room: '',
        attributes: { deviceClass: 'temperature' },
      }),
    ]);
    expect(resolveMetric(HOME_OS_ROLES.environmentTemperature, entities).reasonCode).toBe(
      'candidate_unmapped'
    );
  });

  it('reports candidate_ambiguous for equally strong candidates', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.room_a_temperature',
        room: 'A',
        attributes: { deviceClass: 'temperature' },
      }),
      homeOsEntity({
        externalId: 'sensor.room_b_temperature',
        room: 'B',
        attributes: { deviceClass: 'temperature' },
      }),
    ]);
    expect(resolveMetric(HOME_OS_ROLES.environmentTemperature, entities).reasonCode).toBe(
      'candidate_ambiguous'
    );
  });

  it('reports mapped_unavailable for an unavailable mapped metric', () => {
    const id = 'sensor.pve_temperature';
    const entities = resolveSemanticEntities(
      [homeOsEntity({ externalId: id, availability: 'unavailable', primaryState: 'unavailable' })],
      [manual(id, HOME_OS_ROLES.homelabPveTemperature)]
    );
    expect(resolveMetric(HOME_OS_ROLES.homelabPveTemperature, entities).reasonCode).toBe(
      'mapped_unavailable'
    );
  });

  it('reports mapped_stale for old telemetry', () => {
    const id = 'sensor.pve_temperature';
    const entities = resolveSemanticEntities(
      [homeOsEntity({ externalId: id, primaryState: 55, lastUpdated: '2026-09-01T00:00:00Z' })],
      [manual(id, HOME_OS_ROLES.homelabPveTemperature)]
    );
    expect(
      resolveMetric(
        HOME_OS_ROLES.homelabPveTemperature,
        entities,
        Date.parse('2026-09-02T00:00:00Z')
      ).reasonCode
    ).toBe('mapped_stale');
  });

  it('never marks static PVE version metadata stale', () => {
    const id = 'sensor.pve_version';
    const entities = resolveSemanticEntities(
      [
        homeOsEntity({
          externalId: id,
          primaryState: '8.3.4',
          lastUpdated: '2024-01-01T00:00:00Z',
        }),
      ],
      [manual(id, HOME_OS_ROLES.homelabPveVersion)]
    );
    expect(
      resolveMetric(HOME_OS_ROLES.homelabPveVersion, entities, Date.parse('2026-09-02T00:00:00Z'))
        .state
    ).toBe('available');
  });

  it('discovers a TP-Link router CPU metric from device metadata', () => {
    const [resolved] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.archer_router_cpu',
        attributes: { deviceName: 'TP-Link Archer BE800 Router' },
      }),
    ]);
    expect(resolved?.roles).toContain(HOME_OS_ROLES.networkRouterCpu);
  });

  it('excludes refrigerator climate entities from the Climate page', () => {
    expect(
      getClimateDashboardGroup({
        id: 'climate.kitchen_fridge',
        name: '厨房冰箱',
        type: 'climate',
      } as DeviceWithType)
    ).toBeNull();
  });

  it('surfaces a lighting button and uses the trigger command', () => {
    const lights = buildHomeOsLights(
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'button.bedroom_light_toggle',
          type: 'unknown',
          name: '主卧灯切换',
          room: '主卧',
        }),
      ])
    );
    expect(lights).toHaveLength(1);
    expect(getWholeHomeLightActions(lights)[0]?.command).toBe('trigger');
  });

  it('aggregates a multi-entity bath heater as one functional device', () => {
    const devices = discoverBathHeaterFunctionalDevices(
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'switch.bath_heater',
          attributes: { deviceId: 'bath-1', deviceName: '主卫浴霸' },
        }),
        homeOsEntity({
          externalId: 'button.bath_heater_dry',
          attributes: { deviceId: 'bath-1', deviceName: '主卫浴霸' },
        }),
        homeOsEntity({
          externalId: 'sensor.bath_heater_temperature',
          attributes: { deviceId: 'bath-1', deviceName: '主卫浴霸' },
        }),
      ])
    );
    expect(devices).toHaveLength(1);
    expect(devices[0]?.sourceEntityIds).toHaveLength(3);
  });

  it('uses moon entity data and never fabricates realtime sun data', () => {
    const snapshot = getAstronomySnapshot(
      resolveSemanticEntities([
        homeOsEntity({ externalId: 'sensor.moon_phase', primaryState: 'full_moon' }),
      ]),
      new Date('2026-09-02T12:00:00+08:00')
    );
    expect(snapshot.moonSource).toBe('entity');
    expect(snapshot.moon.name.en).toBe('Full moon');
    expect(snapshot.sunSource).toBe('unavailable');
    expect(snapshot.daylightProgress).toBeUndefined();
  });
});
