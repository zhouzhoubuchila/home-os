import { describe, expect, it } from 'vitest';
import { resolveFunctionalDevices } from '../adapters/functional-device-adapter';
import { buildPvePhysicalDevices } from '../adapters/physical-device-adapter';
import { createDefaultHomeOsConfig, isHomeOsConfig } from '../config/schema';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ManualEntityMapping } from '../core/types';
import { buildRealEnvironmentSnapshot } from '../diagnostics/real-environment-export';
import { removeManualMapping } from '../mapping/manual-overrides';
import { resolveMetric } from '../mapping/metric-resolution';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

const manual = (
  entityId: string,
  role: string,
  extra: Partial<ManualEntityMapping> = {}
): ManualEntityMapping => ({
  schemaVersion: 2,
  entityId,
  semanticRoles: [role],
  source: 'manual',
  updatedAt: '2026-09-18T00:00:00.000Z',
  ...extra,
});

describe('Home OS V2.0.4 mapping center behavior', () => {
  it('resets a manual mapping to automatic classification', () => {
    const entity = homeOsEntity({ externalId: 'switch.study_switch' });
    const mapping = manual(entity.externalId, HOME_OS_ROLES.lightingSwitch);
    const automatic = resolveSemanticEntities(
      [entity],
      removeManualMapping([mapping], entity.externalId, entity.providerId)
    )[0];

    expect(automatic?.source).not.toBe('manual');
    expect(automatic?.roles).toEqual([HOME_OS_ROLES.deviceSwitch]);
  });

  it('keeps ignored entities in diagnostics but out of card mapping', () => {
    const entity = homeOsEntity({ externalId: 'sensor.debug_rssi', primaryState: -61 });
    const resolved = resolveSemanticEntities(
      [entity],
      [manual(entity.externalId, 'diagnostic.connectivity', { ignored: true })]
    );
    const snapshot = buildRealEnvironmentSnapshot(resolved, createDefaultHomeOsConfig());

    expect(resolved[0]?.ignored).toBe(true);
    expect(snapshot.entities[0]).toMatchObject({ entityId: entity.externalId, ignored: true });
    expect(resolveMetric('diagnostic.connectivity', resolved).state).toBe('capability_absent');
  });

  it('combines different control, state, power, and voltage entities', () => {
    const resolved = resolveSemanticEntities([
      homeOsEntity({ externalId: 'switch.study_switch', primaryState: 'on' }),
      homeOsEntity({ externalId: 'binary_sensor.study_light_state', primaryState: 'on' }),
      homeOsEntity({ externalId: 'sensor.study_power', primaryState: 18 }),
      homeOsEntity({ externalId: 'sensor.study_voltage', primaryState: 228 }),
    ]);
    const device: HomeOsFunctionalDevice = {
      id: 'study-light',
      kind: 'light',
      name: 'Study light',
      stateEntityId: 'binary_sensor.study_light_state',
      controls: { on: 'switch.study_switch', off: 'switch.study_switch' },
      metrics: { power: 'sensor.study_power', voltage: 'sensor.study_voltage' },
      sourceEntityIds: resolved.map((item) => item.entity.externalId),
      manual: true,
    };

    const [result] = resolveFunctionalDevices([device], resolved);
    expect(result?.entities).toHaveLength(4);
    expect(result?.stateEntityId).not.toBe(result?.controls?.on);
    expect(result?.missingEntityIds).toEqual([]);
  });

  it('stores trigger capability without treating it as toggle or turn off', () => {
    const config = createDefaultHomeOsConfig();
    config.functionalDevices = [
      {
        id: 'doorbell-trigger',
        kind: 'switch',
        name: 'Doorbell trigger',
        controls: { trigger: 'button.doorbell' },
        metrics: {},
        sourceEntityIds: ['button.doorbell'],
        manual: true,
      },
    ];

    expect(isHomeOsConfig(config)).toBe(true);
    expect(config.functionalDevices[0]?.controls).toEqual({ trigger: 'button.doorbell' });
    expect(config.functionalDevices[0]?.controls?.off).toBeUndefined();
  });

  it('keeps PVE nodes separated by Registry device identity', () => {
    const resolved = resolveSemanticEntities(
      ['node-a', 'node-b'].flatMap((deviceId) => [
        homeOsEntity({
          externalId: `sensor.${deviceId}_cpu`,
          name: `${deviceId} PVE CPU usage`,
          primaryState: '20',
          attributes: { integration: 'proxmoxve', deviceId, deviceName: deviceId, unit: '%' },
        }),
        homeOsEntity({
          externalId: `sensor.${deviceId}_temperature`,
          name: `${deviceId} PVE temperature`,
          primaryState: '55',
          attributes: {
            integration: 'proxmoxve',
            deviceId,
            deviceName: deviceId,
            deviceClass: 'temperature',
            unit: '°C',
          },
        }),
      ])
    );

    const devices = buildPvePhysicalDevices(resolved);
    expect(devices).toHaveLength(2);
    expect(devices.map(({ entityIds }) => entityIds)).toEqual([
      ['sensor.node-a_cpu', 'sensor.node-a_temperature'],
      ['sensor.node-b_cpu', 'sensor.node-b_temperature'],
    ]);
  });

  it('keeps router and Internet manual metrics in separate functional devices', () => {
    const devices: HomeOsFunctionalDevice[] = [
      {
        id: 'main-router',
        kind: 'router',
        name: 'Main router',
        metrics: { clients: 'sensor.router_clients' },
        sourceEntityIds: ['sensor.router_clients'],
      },
      {
        id: 'internet',
        kind: 'internet',
        name: 'Internet',
        metrics: { latency: 'sensor.wan_latency' },
        sourceEntityIds: ['sensor.wan_latency'],
      },
    ];
    const resolved = resolveSemanticEntities([
      homeOsEntity({ externalId: 'sensor.router_clients' }),
      homeOsEntity({ externalId: 'sensor.wan_latency' }),
    ]);
    const result = resolveFunctionalDevices(devices, resolved);

    expect(result[0]?.entities.map((item) => item.entity.externalId)).toEqual([
      'sensor.router_clients',
    ]);
    expect(result[1]?.entities.map((item) => item.entity.externalId)).toEqual([
      'sensor.wan_latency',
    ]);
  });

  it('groups air-quality entities by Registry device in diagnostics', () => {
    const resolved = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sensor.living_pm25',
        attributes: { deviceId: 'air-monitor-1', deviceClass: 'pm25', unit: 'µg/m³' },
      }),
      homeOsEntity({
        externalId: 'sensor.living_co2',
        attributes: {
          deviceId: 'air-monitor-1',
          deviceClass: 'carbon_dioxide',
          unit: 'ppm',
        },
      }),
    ]);
    const snapshot = buildRealEnvironmentSnapshot(resolved, createDefaultHomeOsConfig());

    expect(snapshot.registryDevices).toContainEqual(
      expect.objectContaining({
        deviceId: 'air-monitor-1',
        entities: ['sensor.living_pm25', 'sensor.living_co2'],
      })
    );
  });

  it('preserves explicit household tracker association', () => {
    const person = homeOsEntity({ externalId: 'person.alex' });
    const resolved = resolveSemanticEntities(
      [person],
      [manual(person.externalId, HOME_OS_ROLES.familyPerson, { familyPersonId: 'alex' })]
    );

    expect(resolved[0]?.mapping?.familyPersonId).toBe('alex');
    expect(resolved[0]?.source).toBe('manual');
  });

  it.each(['unavailable', 'unknown'] as const)('rejects %s as a usable metric', (state) => {
    const entity = homeOsEntity({
      externalId: 'sensor.room_temperature',
      primaryState: state,
      availability: state,
    });
    const resolved = resolveSemanticEntities(
      [entity],
      [manual(entity.externalId, HOME_OS_ROLES.environmentTemperature)]
    );

    expect(resolveMetric(HOME_OS_ROLES.environmentTemperature, resolved).state).toBe('unavailable');
  });
});
