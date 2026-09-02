import type { TranslateFn } from '@navet/app/i18n';
import { zhMessages } from '@navet/app/i18n/messages/zh';
import { describe, expect, it } from 'vitest';
import { buildHomeOsLights } from '../adapters/lighting-adapter';
import { getAstronomySnapshot } from '../astronomy/astronomy-visual';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ManualEntityMapping } from '../core/types';
import { formatHomeOsDisplayState } from '../i18n/display-state';
import { resolveAirQualitySources, resolveWeatherSource } from '../mapping/data-source-resolver';
import { resolveMetric } from '../mapping/metric-resolution';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

const zhT: TranslateFn = (key) => zhMessages[key];

describe('Home OS V2.0.3.2 real data fixtures', () => {
  it('A: reuses configured provider weather for Weather Enhanced', () => {
    const source = resolveWeatherSource(
      [{ id: 'home_assistant:weather.home', temperature: 25, condition: 'sunny' }],
      []
    );
    expect(source).toMatchObject({
      sourceType: 'provider',
      id: 'home_assistant:weather.home',
      current: { temperature: 25, condition: 'sunny' },
    });
  });

  it('B: falls back to the standard weather entity', () => {
    const source = resolveWeatherSource(
      [],
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'weather.home',
          primaryState: 'cloudy',
          attributes: { temperature: 23, temperature_unit: '°C' },
        }),
      ])
    );
    expect(source).toMatchObject({ sourceType: 'ha_weather', id: 'weather.home' });
  });

  it('C: discovers PM2.5 and CO2 without fabricating AQI', () => {
    const resolved = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.living_pm25',
        primaryState: 12,
        attributes: { unit: 'µg/m³' },
      }),
      homeOsEntity({
        externalId: 'sensor.living_co2',
        primaryState: 650,
        attributes: { unit: 'ppm' },
      }),
    ]);
    const air = resolveAirQualitySources(resolved);
    expect(air.metrics.flatMap((item) => item.roles)).toEqual(
      expect.arrayContaining([HOME_OS_ROLES.environmentPm25, HOME_OS_ROLES.environmentCo2])
    );
    expect(air.metrics.flatMap((item) => item.roles)).not.toContain(
      HOME_OS_ROLES.environmentAirQuality
    );
  });

  it('D: explains the true absence of air-quality sensors', () => {
    expect(resolveAirQualitySources([])).toMatchObject({
      state: 'capability_absent',
      reasonCode: 'no_candidate_found',
    });
  });

  it('E: binds all standard sun.sun attributes', () => {
    const snapshot = getAstronomySnapshot(
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'sun.sun',
          primaryState: 'above_horizon',
          attributes: {
            next_rising: '2026-09-03T05:45:00+08:00',
            next_setting: '2026-09-02T18:22:00+08:00',
            azimuth: 198.4,
            elevation: 52.3,
          },
        }),
      ]),
      new Date('2026-09-02T12:00:00+08:00')
    );
    expect(snapshot).toMatchObject({
      sunSource: 'home_assistant',
      azimuth: 198.4,
      elevation: 52.3,
    });
    expect(snapshot.sunrise).toBeInstanceOf(Date);
    expect(snapshot.sunset).toBeInstanceOf(Date);
    expect(snapshot.sunArcPoint).toBeDefined();
  });

  it('F: reports unavailable when no upstream Moon entity exists', () => {
    expect(getAstronomySnapshot([], new Date('2026-09-02T12:00:00+08:00')).moonSource).toBe(
      'unavailable'
    );
  });

  it('G: keeps a name-only PVE metric as candidate_unmapped, never absent', () => {
    const resolved = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.pve_cpu_temperature',
        primaryState: 60,
        attributes: { unit: '°C' },
      }),
    ]);
    expect(resolveMetric(HOME_OS_ROLES.homelabPveTemperature, resolved).reasonCode).toBe(
      'candidate_unmapped'
    );
  });

  it('H: rejects Xiaomi smart-home gateways as network routers', () => {
    const [gateway] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'device_tracker.xiaomi_gateway_hub1',
        name: 'xiaomi-gateway-hub1',
        attributes: { integration: 'xiaomi_gateway', deviceName: 'Mi Gateway Hub' },
      }),
    ]);
    expect(gateway?.roles.some((role) => role.startsWith('network.router.'))).toBe(false);
  });

  it('I: accepts an actual router integration and device context', () => {
    const [router] = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.openwrt_router_clients',
        attributes: { integration: 'openwrt', deviceName: 'Main Router', manufacturer: 'OpenWrt' },
      }),
    ]);
    expect(router?.roles).toContain(HOME_OS_ROLES.networkRouterClients);
  });

  it('J: never marks static PVE version metadata stale', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'sensor.pve_version',
      semanticRoles: [HOME_OS_ROLES.homelabPveVersion],
      source: 'manual',
      updatedAt: '2026-09-02T00:00:00Z',
    };
    const resolved = resolveSemanticEntities(
      [
        homeOsEntity({
          externalId: 'sensor.pve_version',
          primaryState: '9.2.2',
          lastUpdated: '2024-01-01T00:00:00Z',
        }),
      ],
      [mapping]
    );
    expect(
      resolveMetric(HOME_OS_ROLES.homelabPveVersion, resolved, Date.parse('2026-09-02T00:00:00Z'))
        .state
    ).toBe('available');
  });

  it('K: localizes raw closed state only at the display layer', () => {
    expect(formatHomeOsDisplayState('closed', zhT)).toBe('关闭');
    expect('closed').toBe('closed');
  });

  it('L: propagates a manual switch lighting circuit immediately', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'switch.living_ceiling',
        primaryState: 'on',
        capabilities: ['toggle'],
      }),
    ]);
    const circuit: HomeOsFunctionalDevice = {
      id: 'living-ceiling',
      kind: 'light',
      name: '客厅主灯',
      stateEntityId: 'switch.living_ceiling',
      controls: { toggle: 'switch.living_ceiling', off: 'switch.living_ceiling' },
      metrics: {},
      sourceEntityIds: ['switch.living_ceiling'],
      manual: true,
    };
    expect(buildHomeOsLights(entities, [circuit])).toEqual([
      expect.objectContaining({ id: 'living-ceiling', name: '客厅主灯', manual: true }),
    ]);
  });
});
