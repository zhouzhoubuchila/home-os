import { describe, expect, it } from 'vitest';
import { buildFamilyMembers } from '../adapters/family-adapter';
import { buildHomeOsLights, getWholeHomeLightActions } from '../adapters/lighting-adapter';
import { buildPvePhysicalDevices } from '../adapters/physical-device-adapter';
import { evaluateAlerts } from '../alerts/alert-engine';
import { getDefaultHomeOsAlertRules } from '../alerts/default-rules';
import { exportHomeOsConfig, importHomeOsConfig } from '../config/export-import';
import { createDefaultHomeOsConfig, isHomeOsConfig } from '../config/schema';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { buildHomeOsIndexes } from '../mapping/home-os-indexes';
import { resolveMetric } from '../mapping/metric-resolution';
import { buildHomeOsMappingSearchIndex } from '../mapping/search-index';
import { resolveSemanticEntities, resolveSemanticEntity } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('Home OS V2.0.3 release matrix', () => {
  it('keeps an actual measured zero available instead of treating it as missing', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.room_temperature',
        room: 'Room',
        primaryState: 0,
        lastUpdated: '2026-09-02T00:00:00Z',
        attributes: { deviceClass: 'temperature', unit: '°C' },
      }),
    ]);
    expect(
      resolveMetric(
        HOME_OS_ROLES.environmentTemperature,
        entities,
        Date.parse('2026-09-02T00:01:00Z')
      )
    ).toMatchObject({ state: 'available', value: 0 });
  });

  it.each([
    HOME_OS_ROLES.networkRouterOnline,
    HOME_OS_ROLES.networkInternetLatency,
    HOME_OS_ROLES.energyGasCurrent,
  ])('reports capability_absent for an unsupported detail metric %s', (role) => {
    expect(resolveMetric(role, []).state).toBe('capability_absent');
  });

  it('reports unmapped when a credible role candidate needs review', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.temperature',
        room: '',
        attributes: { deviceClass: 'temperature' },
      }),
    ]);
    expect(resolveMetric(HOME_OS_ROLES.environmentTemperature, entities).state).toBe('unmapped');
  });

  it('groups all major PVE metrics under one device context', () => {
    const entities = ['cpu', 'memory', 'storage', 'vm_running', 'version'].map((metric) =>
      homeOsEntity({
        externalId: `sensor.pve_${metric}`,
        name: `PVE ${metric}`,
        attributes: { integration: 'proxmoxve', deviceName: 'PVE Node' },
      })
    );
    const [device] = buildPvePhysicalDevices(resolveSemanticEntities(entities));
    expect(device?.entityIds).toHaveLength(5);
    expect(Object.keys(device?.semanticMetrics ?? {})).toEqual(
      expect.arrayContaining([
        HOME_OS_ROLES.homelabPveCpu,
        HOME_OS_ROLES.homelabPveMemory,
        HOME_OS_ROLES.homelabPveStorage,
        HOME_OS_ROLES.homelabPveVmRunning,
        HOME_OS_ROLES.homelabPveVersion,
      ])
    );
  });

  it('propagates device context to sibling entities in mapping search', () => {
    const resolved = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.fridge_temperature',
        attributes: { deviceId: 'fridge-1', deviceName: '厨房冰箱' },
      }),
      homeOsEntity({
        externalId: 'binary_sensor.fridge_door',
        name: 'Door',
        attributes: { deviceId: 'fridge-1' },
      }),
    ]);
    expect(buildHomeOsMappingSearchIndex(resolved).search('冰箱')).toHaveLength(2);
  });

  it('builds semantic, provider device, and physical-device indexes in one pass', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'sensor.pve_cpu',
      semanticRoles: [HOME_OS_ROLES.homelabPveCpu],
      physicalDeviceId: 'pve-main',
      source: 'manual',
      updatedAt: '2026-09-02T00:00:00Z',
    };
    const indexes = buildHomeOsIndexes(
      resolveSemanticEntities(
        [homeOsEntity({ externalId: 'sensor.pve_cpu', attributes: { deviceId: 'device-pve' } })],
        [mapping]
      )
    );
    expect(indexes.semanticRoleIndex.get(HOME_OS_ROLES.homelabPveCpu)).toHaveLength(1);
    expect(indexes.deviceIndex.get('device-pve')).toHaveLength(1);
    expect(indexes.physicalDeviceIndex.get('pve-main')).toHaveLength(1);
  });

  it('links family tracker sources from provider metadata', () => {
    const members = buildFamilyMembers(
      resolveSemanticEntities([
        homeOsEntity({ externalId: 'person.alex', name: 'Alex', primaryState: 'home' }),
        homeOsEntity({
          externalId: 'device_tracker.alex_phone',
          name: 'Alex phone',
          attributes: { personEntityId: 'person.alex' },
        }),
      ])
    );
    expect(members[0]?.trackerSources[0]).toMatchObject({
      entityId: 'device_tracker.alex_phone',
      name: 'Alex phone',
    });
  });

  it('enriches alert detail with device, value, duration, room, and source', () => {
    const now = Date.parse('2026-09-02T01:00:00Z');
    const alerts = evaluateAlerts(
      resolveSemanticEntities([
        homeOsEntity({
          externalId: 'sensor.phone_battery',
          name: 'Phone battery',
          room: 'Hall',
          primaryState: 6,
          lastUpdated: '2026-09-02T00:30:00Z',
          attributes: {
            deviceClass: 'battery',
            unit: '%',
            deviceName: 'Alex phone',
            stateChangedAt: '2026-09-02T00:30:00Z',
          },
        }),
      ]),
      getDefaultHomeOsAlertRules('en'),
      now
    );
    expect(alerts[0]).toMatchObject({
      deviceName: 'Alex phone',
      room: 'Hall',
      currentValue: 6,
      unit: '%',
      durationMs: 1_800_000,
      sourceEntityId: 'sensor.phone_battery',
    });
  });

  it('localizes the default battery alert in Chinese', () => {
    expect(
      getDefaultHomeOsAlertRules('zh').find((rule) => rule.id === 'battery-low')?.message
    ).toBe('电池电量低');
  });

  it('round-trips functional lighting devices through the safe config export', () => {
    const config = createDefaultHomeOsConfig('2026-09-02T00:00:00Z');
    config.functionalDevices = [
      {
        id: 'wall-light',
        kind: 'light',
        name: '墙灯',
        controls: { toggle: 'switch.wall_light' },
        metrics: {},
        sourceEntityIds: ['switch.wall_light'],
        manual: true,
      },
    ];
    expect(importHomeOsConfig(exportHomeOsConfig(config)).functionalDevices).toEqual(
      config.functionalDevices
    );
  });

  it('rejects malformed functional device controls during import validation', () => {
    const config = createDefaultHomeOsConfig();
    expect(
      isHomeOsConfig({
        ...config,
        functionalDevices: [
          {
            id: 'bad',
            kind: 'light',
            name: 'Bad',
            controls: { toggle: 42 },
            metrics: {},
            sourceEntityIds: [],
          },
        ],
      })
    ).toBe(false);
  });

  it('never auto-adds an unrelated switch to whole-home lighting', () => {
    const lights = buildHomeOsLights(
      resolveSemanticEntities([homeOsEntity({ externalId: 'switch.coffee_machine' })])
    );
    expect(lights).toHaveLength(0);
  });

  it('uses trigger for a button-backed lighting circuit action', () => {
    const entities = resolveSemanticEntities([homeOsEntity({ externalId: 'button.lamp_off' })]);
    const lights = buildHomeOsLights(entities, [
      {
        id: 'lamp',
        kind: 'light',
        name: 'Lamp',
        controls: { off: 'button.lamp_off' },
        metrics: {},
        sourceEntityIds: ['button.lamp_off'],
        manual: true,
      },
    ]);
    expect(getWholeHomeLightActions(lights)[0]).toMatchObject({
      entityId: 'button.lamp_off',
      command: 'trigger',
    });
  });

  it('does not auto-accept a generic temperature without residential context', () => {
    const result = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.temperature',
        room: '',
        attributes: { deviceClass: 'temperature' },
      })
    );
    expect(result.confidence).toBeLessThan(0.9);
    expect(result.needsReview).toBe(true);
  });
});
