import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';

export interface FamilyMember {
  id: string;
  name: string;
  personEntityId: string;
  trackerEntityIds: string[];
  state: string;
  lastChanged?: string;
  location?: string;
  battery?: number;
  avatar?: string;
  trackerSources: Array<{
    entityId: string;
    name: string;
    state: string;
    lastUpdated?: string;
  }>;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export function buildFamilyMembers(entities: readonly ResolvedSemanticEntity[]): FamilyMember[] {
  const visible = entities.filter((entity) => !entity.ignored && entity.displayMode !== 'hidden');
  const trackersByPerson = new Map<string, string[]>();
  const trackerById = new Map<string, ResolvedSemanticEntity>();
  for (const tracker of visible.filter((entity) =>
    entity.roles.includes(HOME_OS_ROLES.familyTracker)
  )) {
    trackerById.set(tracker.entity.externalId, tracker);
    const personId =
      tracker.mapping?.familyPersonId ??
      asString(
        tracker.entity.attributes.personEntityId ?? tracker.entity.attributes.person_entity_id
      );
    if (!personId) continue;
    trackersByPerson.set(personId, [
      ...(trackersByPerson.get(personId) ?? []),
      tracker.entity.externalId,
    ]);
  }

  return visible
    .filter((entity) => entity.roles.includes(HOME_OS_ROLES.familyPerson))
    .map((person) => {
      const trackerEntityIds = trackersByPerson.get(person.entity.externalId) ?? [];
      return {
        id: person.entity.canonicalId,
        name: person.displayName,
        personEntityId: person.entity.externalId,
        trackerEntityIds,
        state: String(person.entity.primaryState ?? 'unknown'),
        lastChanged: asString(person.entity.attributes.lastChanged) ?? person.entity.lastUpdated,
        location: asString(person.entity.attributes.location) ?? person.room,
        battery:
          typeof person.entity.attributes.battery === 'number'
            ? person.entity.attributes.battery
            : undefined,
        avatar: person.entity.resources?.primary_image?.path,
        trackerSources: trackerEntityIds.flatMap((entityId) => {
          const tracker = trackerById.get(entityId);
          return tracker
            ? [
                {
                  entityId,
                  name: tracker.displayName,
                  state: String(tracker.entity.primaryState ?? 'unknown'),
                  lastUpdated: tracker.entity.lastUpdated,
                },
              ]
            : [];
        }),
      };
    });
}
