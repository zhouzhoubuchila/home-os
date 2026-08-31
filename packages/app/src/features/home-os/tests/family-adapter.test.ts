import { describe, expect, it } from 'vitest';
import { buildFamilyMembers } from '../adapters/family-adapter';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('family adapter', () => {
  it('counts only person entities and binds an explicitly assigned tracker', () => {
    const trackerMapping: ManualEntityMapping = {
      schemaVersion: 2,
      entityId: 'device_tracker.alex_phone',
      semanticRoles: [HOME_OS_ROLES.familyTracker],
      familyPersonId: 'person.alex',
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const resolved = resolveSemanticEntities(
      [
        homeOsEntity({ externalId: 'person.alex', name: 'Alex', primaryState: 'home' }),
        homeOsEntity({ externalId: 'device_tracker.alex_phone', name: 'Alex phone' }),
        homeOsEntity({ externalId: 'device_tracker.guest_phone', name: 'Guest phone' }),
      ],
      [trackerMapping]
    );
    const members = buildFamilyMembers(resolved);
    expect(members).toHaveLength(1);
    expect(members[0]?.trackerEntityIds).toEqual(['device_tracker.alex_phone']);
  });
});
