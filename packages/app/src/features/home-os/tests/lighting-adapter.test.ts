import { describe, expect, it } from 'vitest';
import { buildHomeOsLights, getWholeHomeLightTargets } from '../adapters/lighting-adapter';
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
});
