import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { buildHomeOsDiagnostics } from '../mapping/diagnostics';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('Home OS development diagnostics', () => {
  it('reports detected roles, card sources, missing role prefixes, and ambiguity', () => {
    const entities = [
      homeOsEntity({ externalId: 'sensor.room_temperature_a', primaryState: 22 }),
      homeOsEntity({ externalId: 'sensor.room_temperature_b', primaryState: 23 }),
      homeOsEntity({ externalId: 'calendar.family', type: 'calendar', primaryState: 'on' }),
    ];
    const mappings: ManualEntityMapping[] = entities.slice(0, 2).map((entity) => ({
      schemaVersion: 2,
      entityId: entity.externalId,
      stableRef: { providerId: entity.providerId },
      semanticRoles: [HOME_OS_ROLES.environmentTemperature],
      source: 'manual',
      updatedAt: '2026-09-18T00:00:00.000Z',
    }));
    const diagnostics = buildHomeOsDiagnostics(resolveSemanticEntities(entities, mappings));

    expect(diagnostics.entities[2]).toMatchObject({
      entityId: 'calendar.family',
      finalRoles: [HOME_OS_ROLES.familyCalendar],
      usedByCards: expect.arrayContaining(['calendar']),
    });
    expect(diagnostics.cards.find(({ card }) => card === 'calendar')).toMatchObject({
      matchedRoles: [HOME_OS_ROLES.familyCalendar],
      selectedEntities: [{ role: HOME_OS_ROLES.familyCalendar, entityId: 'calendar.family' }],
      missingRequiredRoles: [],
    });
    expect(diagnostics.cards.find(({ card }) => card === 'router')?.missingRequiredRoles).toEqual([
      'network.router.',
    ]);
    expect(diagnostics.ambiguousRoles).toContainEqual({
      role: HOME_OS_ROLES.environmentTemperature,
      entityIds: ['sensor.room_temperature_a', 'sensor.room_temperature_b'],
    });
  });
});
