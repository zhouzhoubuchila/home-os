import type { NavetEntity } from '@navet/core/types';
import type { ManualEntityMapping } from '../core/types';
import { stableRefMatchScore } from './stable-entity-ref';

export function findManualMapping(
  entity: NavetEntity,
  mappings: readonly ManualEntityMapping[]
): ManualEntityMapping | undefined {
  const exact = mappings.find(
    (mapping) => mapping.entityId === entity.externalId || mapping.entityId === entity.id
  );
  if (exact) return exact;

  const stable = mappings
    .filter((mapping) => mapping.stableRef)
    .map((mapping) => ({ mapping, score: stableRefMatchScore(mapping.stableRef ?? {}, entity) }))
    .filter(({ score }) => score >= 90)
    .sort((left, right) => right.score - left.score);
  if (stable.length !== 1 || (stable[1] && stable[1].score === stable[0]?.score)) return undefined;
  return stable[0]?.mapping;
}

export function upsertManualMapping(
  mappings: readonly ManualEntityMapping[],
  next: ManualEntityMapping
) {
  const index = mappings.findIndex((mapping) => mapping.entityId === next.entityId);
  if (index === -1) return [...mappings, next];
  return mappings.map((mapping, mappingIndex) => (mappingIndex === index ? next : mapping));
}
