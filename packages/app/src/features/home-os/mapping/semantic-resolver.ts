import type { NavetEntity } from '@navet/core/types';
import type { ManualEntityMapping, ResolvedSemanticEntity } from '../core/types';
import { classifyEntity } from './auto-classifier';
import { shouldSurfaceMappingReview } from './confidence';
import { isHomeAssistantRoleCompatible } from './home-assistant-role-compatibility';
import { isInternetRoleCompatible } from './internet-role-compatibility';
import { findManualMapping } from './manual-overrides';

export function resolveSemanticEntity(
  entity: NavetEntity,
  mappings: readonly ManualEntityMapping[] = []
): ResolvedSemanticEntity {
  const candidates = classifyEntity(entity).filter(
    ({ role }) =>
      isInternetRoleCompatible(entity, role) && isHomeAssistantRoleCompatible(entity, role)
  );
  const mapping = findManualMapping(entity, mappings);
  const mappedRoles = mapping?.semanticRoles?.filter(
    (role) => isInternetRoleCompatible(entity, role) && isHomeAssistantRoleCompatible(entity, role)
  );
  const invalidManualRoles = Boolean(
    mapping?.semanticRoles && mappedRoles?.length !== mapping.semanticRoles.length
  );
  const invalidSelection = invalidManualRoles && mappedRoles?.length === 0;
  const roles = mappedRoles ?? candidates.map(({ role }) => role);
  const confidence = mapping && !invalidSelection ? 1 : (candidates[0]?.confidence ?? 0);
  const ignored = mapping?.ignored === true;
  const entityCategory = String(
    entity.attributes.entityCategory ?? entity.attributes.entity_category ?? ''
  ).toLowerCase();
  const diagnostic =
    mapping?.displayMode === 'diagnostic' ||
    entityCategory === 'diagnostic' ||
    (roles.length > 0 && roles.every((role) => role.startsWith('diagnostic.')));
  const needsReview =
    invalidManualRoles ||
    (!mapping && shouldSurfaceMappingReview({ confidence, roles, diagnostic }));
  const reviewDisposition = ignored
    ? 'ignored'
    : diagnostic
      ? 'diagnostic'
      : invalidSelection
        ? 'review'
        : mapping
          ? 'mapped'
          : needsReview
            ? 'review'
            : roles.length
              ? 'mapped'
              : 'unmapped';
  return {
    entity,
    candidates,
    roles,
    confidence,
    reasons: invalidManualRoles
      ? ['stored semantic role failed compatibility validation']
      : mapping
        ? ['manual override']
        : (candidates[0]?.reasons ?? []),
    source: mapping && !invalidSelection ? 'manual' : (candidates[0]?.source ?? 'unmapped'),
    mapping,
    displayName: mapping?.displayName?.trim() || entity.name,
    room: mapping?.roomOverride?.trim() || entity.room,
    displayMode: ignored
      ? 'hidden'
      : (mapping?.displayMode ??
        (mapping?.hidden ? 'hidden' : diagnostic ? 'diagnostic' : 'primary')),
    controlPolicy: mapping?.controlPolicy ?? 'direct',
    ignored,
    needsReview,
    reviewDisposition,
  };
}

export function resolveSemanticEntities(
  entities: readonly NavetEntity[],
  mappings: readonly ManualEntityMapping[] = []
) {
  return entities.map((entity) => resolveSemanticEntity(entity, mappings));
}
