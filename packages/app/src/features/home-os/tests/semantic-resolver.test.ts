import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveSemanticEntity } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('semantic resolver', () => {
  it('classifies person, light, and tracker domains without treating trackers as people', () => {
    expect(resolveSemanticEntity(homeOsEntity({ externalId: 'person.alex' })).roles).toContain(
      HOME_OS_ROLES.familyPerson
    );
    expect(resolveSemanticEntity(homeOsEntity({ externalId: 'light.kitchen' })).roles).toContain(
      HOME_OS_ROLES.lightingLight
    );
    const tracker = resolveSemanticEntity(homeOsEntity({ externalId: 'device_tracker.phone' }));
    expect(tracker.roles).toContain(HOME_OS_ROLES.familyTracker);
    expect(tracker.roles).not.toContain(HOME_OS_ROLES.familyPerson);
  });

  it('does not classify an ordinary switch as lighting', () => {
    const result = resolveSemanticEntity(homeOsEntity({ externalId: 'switch.coffee_machine' }));
    expect(result.roles).toEqual([HOME_OS_ROLES.deviceSwitch]);
  });

  it('gives manual mappings priority and recovers them by stable unique id', () => {
    const mapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'switch.old_lamp',
      stableRef: { providerId: 'home_assistant', uniqueId: 'stable-lamp' },
      semanticRoles: [HOME_OS_ROLES.lightingSwitch],
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const result = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'switch.renamed_lamp',
        attributes: { uniqueId: 'stable-lamp' },
      }),
      [mapping]
    );
    expect(result.roles).toEqual([HOME_OS_ROLES.lightingSwitch]);
    expect(result.source).toBe('manual');
    expect(result.needsReview).toBe(false);
  });

  it('keeps low-confidence name fallback in review', () => {
    const result = resolveSemanticEntity(
      homeOsEntity({ externalId: 'sensor.pve_status', name: 'PVE status' })
    );
    expect(result.roles).toContain(HOME_OS_ROLES.homelabPveOnline);
    expect(result.needsReview).toBe(true);
  });
});
