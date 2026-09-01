import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import { resolveMetric } from '../mapping/metric-resolution';
import { buildHomeOsMappingSearchIndex } from '../mapping/search-index';
import { resolveSemanticEntities, resolveSemanticEntity } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';
import { REAL_ENVIRONMENT_ENTITIES } from './real-environment-fixture';

describe('Home OS V2.0.3 real environment resolution', () => {
  const resolved = resolveSemanticEntities(REAL_ENVIRONMENT_ENTITIES);

  it('separates PVE, refrigeration, room, and internal device temperatures', () => {
    expect(resolved[0].roles).toContain(HOME_OS_ROLES.homelabPveTemperature);
    expect(resolved[1].roles).toContain(HOME_OS_ROLES.applianceRefrigerationTemperature);
    expect(resolved[2].roles).toContain(HOME_OS_ROLES.environmentTemperature);
    expect(resolved[3].roles).toContain(HOME_OS_ROLES.deviceInternalTemperature);
    const environment = resolved.filter((item) =>
      item.roles.includes(HOME_OS_ROLES.environmentTemperature)
    );
    expect(environment.map((item) => item.entity.primaryState)).toEqual([24]);
  });

  it('uses negative evidence for misleading door device classes', () => {
    const downLight = resolved[4];
    expect(downLight.roles).toContain(HOME_OS_ROLES.securityDoor);
    expect(downLight.confidence).toBeLessThan(0.9);
    expect(downLight.needsReview).toBe(true);
    expect(downLight.reasons.join(' ')).toContain('negative evidence');
  });

  it('searches by device metadata once indexed', () => {
    const index = buildHomeOsMappingSearchIndex(resolved);
    expect(index.search('冰箱').map((item) => item.entity.externalId)).toContain(
      'sensor.fridge_freezer_temperature'
    );
    expect(index.search('路由').map((item) => item.entity.externalId)).toContain(
      'sensor.router_latency'
    );
  });

  it('distinguishes absent, unmapped, unavailable, stale, and available metrics', () => {
    expect(resolveMetric('missing.role', resolved).state).toBe('capability_absent');
    const review = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.unknown_temperature',
        room: '',
        attributes: { deviceClass: 'temperature' },
      }),
    ]);
    expect(resolveMetric(HOME_OS_ROLES.environmentTemperature, review).state).toBe('unmapped');
    const unavailable = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.room_temperature',
        room: 'Room',
        primaryState: 'unavailable',
        availability: 'unavailable',
        attributes: { deviceClass: 'temperature' },
      }),
    ]);
    expect(resolveMetric(HOME_OS_ROLES.environmentTemperature, unavailable).state).toBe(
      'unavailable'
    );
    const fresh = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.room_temperature',
        room: 'Room',
        primaryState: 22,
        lastUpdated: '2026-09-02T00:00:00.000Z',
        attributes: { deviceClass: 'temperature' },
      })
    );
    expect(
      resolveMetric(
        HOME_OS_ROLES.environmentTemperature,
        [fresh],
        Date.parse('2026-09-02T00:05:00Z')
      ).state
    ).toBe('available');
    expect(
      resolveMetric(
        HOME_OS_ROLES.environmentTemperature,
        [fresh],
        Date.parse('2026-09-02T01:00:00Z')
      ).state
    ).toBe('stale');
  });

  it('indexes and searches 600 entities without re-resolving', () => {
    const startedAt = performance.now();
    const many = resolveSemanticEntities(
      Array.from({ length: 600 }, (_, index) =>
        homeOsEntity({
          externalId: `sensor.fixture_${index}`,
          name: `Fixture ${index}`,
          attributes: { deviceName: index === 583 ? '冰箱设备' : `Device ${index}` },
        })
      )
    );
    const index = buildHomeOsMappingSearchIndex(many);
    expect(index.size).toBe(600);
    expect(index.search('冰箱设备')).toHaveLength(1);
    expect(performance.now() - startedAt).toBeLessThan(250);
  });
});
