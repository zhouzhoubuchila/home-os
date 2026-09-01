import { describe, expect, it } from 'vitest';
import {
  buildHomeOsLights,
  getWholeHomeLightActions,
  getWholeHomeLightTargets,
} from '../adapters/lighting-adapter';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
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
});
