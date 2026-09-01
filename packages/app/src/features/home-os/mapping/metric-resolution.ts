import type { NavetEntity } from '@navet/core/types';
import type { SemanticRole } from '../core/semantic-roles';
import type {
  MetricResolution,
  MetricResolutionCandidate,
  ResolvedSemanticEntity,
} from '../core/types';

export const HOME_OS_FRESHNESS_THRESHOLD_MS = 15 * 60_000;

const entityUnit = (entity: NavetEntity) => {
  const value = entity.attributes.unit ?? entity.attributes.unit_of_measurement;
  return typeof value === 'string' ? value : undefined;
};

const candidateFor = (
  item: ResolvedSemanticEntity,
  role: SemanticRole
): MetricResolutionCandidate | undefined => {
  const match = item.candidates.find((candidate) => candidate.role === role);
  return match
    ? {
        entityId: item.entity.externalId,
        confidence: match.confidence,
        reasons: match.reasons,
      }
    : undefined;
};

export function resolveMetric(
  role: SemanticRole,
  entities: readonly ResolvedSemanticEntity[],
  now = Date.now(),
  freshnessThresholdMs = HOME_OS_FRESHNESS_THRESHOLD_MS
): MetricResolution {
  const visible = entities.filter((item) => !item.ignored && item.displayMode !== 'hidden');
  const mapped = visible.filter(
    (item) => item.roles.includes(role) && item.reviewDisposition === 'mapped'
  );
  const candidates = visible
    .map((item) => candidateFor(item, role))
    .filter((item): item is MetricResolutionCandidate => Boolean(item))
    .sort((left, right) => right.confidence - left.confidence);

  if (mapped.length > 1 && !mapped.some((item) => item.source === 'manual')) {
    return {
      role,
      state: 'ambiguous',
      candidates,
      reason: 'multiple mapped candidates require selection',
    };
  }

  const selected = mapped.find((item) => item.source === 'manual') ?? mapped[0];
  if (!selected) {
    if (candidates.length === 0) {
      return {
        role,
        state: 'capability_absent',
        reason: 'no provider candidate supports this role',
      };
    }
    if (candidates.length > 1 && candidates[0].confidence - candidates[1].confidence < 0.1) {
      return { role, state: 'ambiguous', candidates, reason: 'candidate confidence is too close' };
    }
    return { role, state: 'unmapped', candidates, reason: 'candidate exists but is not mapped' };
  }

  const entity = selected.entity;
  const updatedAt = entity.lastUpdated;
  const updatedMs = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const unavailable =
    entity.availability !== 'available' ||
    entity.primaryState === null ||
    ['unknown', 'unavailable'].includes(String(entity.primaryState).toLowerCase());
  if (unavailable) {
    return {
      role,
      state: 'unavailable',
      mappedEntityId: entity.externalId,
      reason: 'mapped entity is unavailable',
      updatedAt,
    };
  }
  if (Number.isFinite(updatedMs) && now - updatedMs > freshnessThresholdMs) {
    return {
      role,
      state: 'stale',
      mappedEntityId: entity.externalId,
      reason: 'mapped value exceeded freshness threshold',
      value: entity.primaryState,
      unit: entityUnit(entity),
      updatedAt,
    };
  }
  return {
    role,
    state: 'available',
    mappedEntityId: entity.externalId,
    value: entity.primaryState,
    unit: entityUnit(entity),
    updatedAt,
  };
}

export function buildMetricResolutionIndex(
  roles: readonly SemanticRole[],
  entities: readonly ResolvedSemanticEntity[],
  now = Date.now()
) {
  return new Map(roles.map((role) => [role, resolveMetric(role, entities, now)]));
}
