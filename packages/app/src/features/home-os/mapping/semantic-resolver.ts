import type { NavetEntity } from '@navet/core/types';
import type { ManualEntityMapping, ResolvedSemanticEntity } from '../core/types';
import { classifyEntity } from './auto-classifier';
import { needsMappingReview } from './confidence';
import { findManualMapping } from './manual-overrides';

export function resolveSemanticEntity(
  entity: NavetEntity,
  mappings: readonly ManualEntityMapping[] = []
): ResolvedSemanticEntity {
  const candidates = classifyEntity(entity);
  const mapping = findManualMapping(entity, mappings);
  const roles = mapping?.semanticRoles ?? candidates.map(({ role }) => role);
  const confidence = mapping ? 1 : (candidates[0]?.confidence ?? 0);
  const ignored = mapping?.ignored === true;
  return {
    entity,
    candidates,
    roles,
    confidence,
    reasons: mapping ? ['manual override'] : (candidates[0]?.reasons ?? []),
    source: mapping ? 'manual' : (candidates[0]?.source ?? 'unmapped'),
    mapping,
    displayName: mapping?.displayName?.trim() || entity.name,
    room: mapping?.roomOverride?.trim() || entity.room,
    displayMode: ignored
      ? 'hidden'
      : (mapping?.displayMode ?? (mapping?.hidden ? 'hidden' : 'primary')),
    controlPolicy: mapping?.controlPolicy ?? 'direct',
    ignored,
    needsReview: !mapping && needsMappingReview(confidence, roles.length > 0),
  };
}

export function resolveSemanticEntities(
  entities: readonly NavetEntity[],
  mappings: readonly ManualEntityMapping[] = []
) {
  return entities.map((entity) => resolveSemanticEntity(entity, mappings));
}
