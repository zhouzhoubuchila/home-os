import { describe, expect, it } from 'vitest';
import {
  buildHomeOsLights,
  getWholeHomeLightActions,
  getWholeHomeLightTargets,
} from '../adapters/lighting-adapter';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { classifyEntity } from '../mapping/auto-classifier';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('lighting adapter', () => {
  it('includes real lights and manually mapped switches without inventing brightness', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'switch.wall_lamp',
      semanticRoles: [HOME_OS_ROLES.lightingSwitch],
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const lights = buildHomeOsLights(
      resolveSemanticEntities(
        [
          homeOsEntity({ externalId: 'light.ceiling', capabilities: ['toggle', 'brightness'] }),
          homeOsEntity({ externalId: 'switch.wall_lamp', capabilities: ['toggle'] }),
          homeOsEntity({ externalId: 'switch.coffee', capabilities: ['toggle'] }),
        ],
        [mapping]
      )
    );
    expect(lights.map(({ sourceEntityId }) => sourceEntityId)).toEqual([
      'light.ceiling',
      'switch.wall_lamp',
    ]);
    expect(lights[1]?.brightness).toBeUndefined();
    expect(getWholeHomeLightTargets(lights)).not.toContain('switch.coffee');
  });

  it('aggregates state and control entities into a manual lighting circuit', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'binary_sensor.wall_light_state', primaryState: 'on' }),
      homeOsEntity({ externalId: 'switch.wall_light', capabilities: ['toggle'] }),
      homeOsEntity({ externalId: 'button.wall_light_off' }),
    ]);
    const lights = buildHomeOsLights(entities, [
      {
        id: 'living-wall-light',
        kind: 'light',
        name: '客厅墙灯',
        room: '客厅',
        stateEntityId: 'binary_sensor.wall_light_state',
        controls: { toggle: 'switch.wall_light', off: 'button.wall_light_off' },
        metrics: {},
        sourceEntityIds: [
          'binary_sensor.wall_light_state',
          'switch.wall_light',
          'button.wall_light_off',
        ],
        manual: true,
      },
    ]);
    expect(lights).toHaveLength(1);
    expect(lights[0]).toMatchObject({ name: '客厅墙灯', state: 'on', manual: true });
    expect(getWholeHomeLightActions(lights)).toEqual([
      {
        entityId: 'button.wall_light_off',
        command: 'trigger',
        providerId: 'home_assistant',
      },
    ]);
  });

  it('excludes toggle-only buttons from whole-home off actions', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'button.study_light_toggle' }),
    ]);
    const lights = buildHomeOsLights(entities, [
      {
        id: 'study-light',
        kind: 'light',
        name: 'Study light',
        room: 'Study',
        controls: { toggle: 'button.study_light_toggle' },
        metrics: {},
        sourceEntityIds: ['button.study_light_toggle'],
        manual: true,
      },
    ]);

    expect(getWholeHomeLightTargets(lights)).toEqual([]);
    expect(getWholeHomeLightActions(lights)).toEqual([]);
  });

  it('keeps named household lights but excludes real appliance and device-level switch names', () => {
    const valid = [
      ['light.study', '书房灯'],
      ['switch.hall_light', '走廊灯'],
      ['light.living_main', '客厅主灯'],
      ['light.bedroom_ceiling', '卧室吸顶灯'],
      ['switch.kitchen_strip', '厨房灯带'],
    ] as const;
    const excluded = [
      ['switch.range_hood', '吸油烟机'],
      ['switch.ptx_three_key', 'PTX 超薄美学开关 三键'],
      ['switch.ptx_two_key', 'PTX 超薄美学开关 双键'],
      ['switch.bath_heater_n12', '米家智能浴霸 N12'],
      ['switch.bath_heater_n1', '米家智能浴霸 N1'],
      ['switch.clothes_rack_pro', '米家智能晾衣机 Pro'],
      ['switch.washing_machine', '滚筒洗衣机'],
    ] as const;
    const entities = [...valid, ...excluded].map(([externalId, name]) =>
      homeOsEntity({ externalId, name, capabilities: ['toggle'], primaryState: 'on' })
    );
    const lights = buildHomeOsLights(resolveSemanticEntities(entities));
    expect(lights.map((light) => light.name)).toEqual(valid.map(([, name]) => name));
    expect(getWholeHomeLightActions(lights).map((action) => action.entityId)).toEqual(
      valid.map(([id]) => id)
    );
    for (const [id] of excluded) {
      const entity = entities.find((candidate) => candidate.externalId === id);
      expect(entity).toBeDefined();
      if (entity) expect(classifyEntity(entity)[0]?.role).not.toBe(HOME_OS_ROLES.lightingSwitch);
    }
  });

  it('rejects appliance context despite an erroneous lighting role, without rejecting named switch channels', () => {
    const bad = homeOsEntity({
      externalId: 'switch.hood_light',
      name: '照明',
      attributes: { deviceName: '吸油烟机', deviceId: 'hood' },
      capabilities: ['toggle'],
    });
    const channels = [
      homeOsEntity({
        externalId: 'switch.wall_1',
        name: '客厅灯',
        attributes: { deviceName: 'PTX 超薄美学开关 三键', deviceId: 'ptx' },
        capabilities: ['toggle'],
      }),
      homeOsEntity({
        externalId: 'switch.wall_2',
        name: '走廊灯',
        attributes: { deviceName: 'PTX 超薄美学开关 三键', deviceId: 'ptx' },
        capabilities: ['toggle'],
      }),
      homeOsEntity({
        externalId: 'switch.wall_3',
        name: 'PTX 超薄美学开关 三键',
        attributes: { deviceId: 'ptx' },
        capabilities: ['toggle'],
      }),
    ];
    const mappings: ManualEntityMapping[] = [bad, ...channels].map((entity) => ({
      schemaVersion: 2,
      entityId: entity.externalId,
      semanticRoles: [HOME_OS_ROLES.lightingSwitch],
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    }));
    const lights = buildHomeOsLights(resolveSemanticEntities([bad, ...channels], mappings));
    expect(lights.map((light) => light.sourceEntityId)).toEqual(['switch.wall_1', 'switch.wall_2']);
    expect(getWholeHomeLightActions(lights).map((action) => action.entityId)).toEqual([
      'switch.wall_1',
      'switch.wall_2',
    ]);
    const firstLight = lights[0];
    expect(firstLight).toBeDefined();
    if (firstLight)
      expect(
        getWholeHomeLightActions([
          { ...firstLight, name: '吸油烟机', classification: 'household_lighting' },
        ])
      ).toEqual([]);
  });

  it('does not expose or turn off a manually mapped appliance switch', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'switch.hood_light',
        name: '照明',
        attributes: { deviceName: '吸油烟机' },
        capabilities: ['toggle'],
      }),
    ]);
    const lights = buildHomeOsLights(entities, [
      {
        id: 'hood-light',
        kind: 'light',
        name: '厨房灯',
        controls: { off: 'switch.hood_light' },
        stateEntityId: 'switch.hood_light',
        metrics: {},
        sourceEntityIds: ['switch.hood_light'],
        manual: true,
      },
    ]);
    expect(lights).toEqual([]);
    expect(getWholeHomeLightActions(lights)).toEqual([]);
  });
});
