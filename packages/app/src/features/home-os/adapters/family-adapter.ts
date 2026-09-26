import type { IntegrationProviderId } from '@navet/app/types/provider';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';
import { resolveFunctionalDevices } from './functional-device-adapter';

export interface FamilyMember {
  id: string;
  name: string;
  personEntityId: string;
  providerId?: IntegrationProviderId;
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
    platform?: string;
    lastUpdated?: string;
  }>;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

function trackerSource(tracker: ResolvedSemanticEntity) {
  return {
    entityId: tracker.entity.externalId,
    name: tracker.displayName,
    state: String(tracker.entity.primaryState ?? 'unknown'),
    platform:
      asString(tracker.entity.attributes.platform) ??
      asString(tracker.entity.attributes.integration) ??
      asString(tracker.entity.attributes.source),
    lastUpdated: tracker.entity.lastUpdated,
  };
}

function memberFromPerson(
  person: ResolvedSemanticEntity,
  trackers: readonly ResolvedSemanticEntity[],
  name = person.displayName,
  room?: string,
  id = person.entity.canonicalId
): FamilyMember {
  return {
    id,
    name,
    personEntityId: person.entity.externalId,
    providerId: person.entity.providerId,
    trackerEntityIds: trackers.map((tracker) => tracker.entity.externalId),
    state: String(person.entity.primaryState ?? 'unknown'),
    lastChanged: asString(person.entity.attributes.lastChanged) ?? person.entity.lastUpdated,
    location: asString(person.entity.attributes.location) ?? room ?? person.room,
    battery:
      typeof person.entity.attributes.battery === 'number'
        ? person.entity.attributes.battery
        : undefined,
    avatar: person.entity.resources?.primary_image?.path,
    trackerSources: trackers.map(trackerSource),
  };
}

export function buildFamilyMembers(
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[] = []
): FamilyMember[] {
  const visible = entities.filter((entity) => !entity.ignored && entity.displayMode !== 'hidden');
  const functionalPeople = resolveFunctionalDevices(
    functionalDevices.filter((device) => device.kind === 'person'),
    visible
  ).flatMap((device) => {
    if (!device.stateEntity) return [];
    const trackers = ['phone_tracker', 'additional_tracker'].flatMap((key) => {
      const tracker = device.metricEntities[key];
      return tracker ? [tracker] : [];
    });
    return [memberFromPerson(device.stateEntity, trackers, device.name, device.room, device.id)];
  });
  const functionalPersonIds = new Set(functionalPeople.map((member) => member.personEntityId));
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

  const automaticPeople = visible
    .filter((entity) => entity.roles.includes(HOME_OS_ROLES.familyPerson))
    .filter((entity) => !functionalPersonIds.has(entity.entity.externalId))
    .map((person) => {
      const trackerEntityIds = trackersByPerson.get(person.entity.externalId) ?? [];
      return memberFromPerson(
        person,
        trackerEntityIds.flatMap((entityId) => {
          const tracker = trackerById.get(entityId);
          return tracker ? [tracker] : [];
        })
      );
    });
  return [...functionalPeople, ...automaticPeople];
}
