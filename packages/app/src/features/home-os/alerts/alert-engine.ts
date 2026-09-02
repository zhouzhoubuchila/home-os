import type { HomeOsAlertRuleConfig } from '../config/schema';
import type { ResolvedSemanticEntity } from '../core/types';
import type { HomeOsAlert } from './alert-types';

const normalizedState = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

function conditionMatches(rule: HomeOsAlertRuleConfig, entity: ResolvedSemanticEntity) {
  const condition = rule.condition;
  if (condition.type === 'state') {
    return normalizedState(entity.entity.primaryState) === condition.equals.toLowerCase();
  }
  if (condition.type === 'availability') {
    return entity.entity.availability === condition.equals;
  }
  const value = Number(entity.entity.primaryState);
  if (!Number.isFinite(value)) return false;
  if (condition.operator === 'lt') return value < condition.value;
  if (condition.operator === 'lte') return value <= condition.value;
  if (condition.operator === 'gt') return value > condition.value;
  return value >= condition.value;
}

function conditionSince(entity: ResolvedSemanticEntity) {
  const value = entity.entity.attributes.stateChangedAt ?? entity.entity.attributes.lastChanged;
  return typeof value === 'string' ? value : entity.entity.lastUpdated;
}

function alertScope(entity: ResolvedSemanticEntity): HomeOsAlert['scope'] {
  if (entity.roles.some((role) => role.startsWith('security.'))) return 'security';
  if (entity.roles.some((role) => role.startsWith('homelab.') || role.startsWith('network.')))
    return 'system';
  if (entity.roles.some((role) => role.startsWith('environment.'))) return 'environment';
  if (entity.roles.some((role) => role.startsWith('energy.'))) return 'energy';
  if (entity.roles.some((role) => role.startsWith('family.'))) return 'household';
  return 'other';
}

export function evaluateAlerts(
  entities: readonly ResolvedSemanticEntity[],
  rules: readonly HomeOsAlertRuleConfig[],
  now = Date.now()
): HomeOsAlert[] {
  const alerts: HomeOsAlert[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const entity of entities) {
      if (entity.ignored || entity.displayMode === 'hidden') continue;
      if (rule.entityId && rule.entityId !== entity.entity.externalId) continue;
      if (rule.semanticRole && !entity.roles.includes(rule.semanticRole)) continue;
      if (!conditionMatches(rule, entity)) continue;
      const since = conditionSince(entity);
      const sinceMs = since ? Date.parse(since) : now;
      if (rule.durationMs && (!Number.isFinite(sinceMs) || now - sinceMs < rule.durationMs))
        continue;
      alerts.push({
        id: `${rule.id}:${entity.entity.canonicalId}`,
        ruleId: rule.id,
        entityId: entity.entity.externalId,
        severity: rule.severity,
        message: rule.message,
        activeSince: since ?? new Date(now).toISOString(),
        deviceName:
          (typeof entity.entity.attributes.deviceName === 'string'
            ? entity.entity.attributes.deviceName
            : undefined) ?? entity.displayName,
        room: entity.room,
        currentValue: entity.entity.primaryState,
        unit:
          typeof (entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement) ===
          'string'
            ? String(entity.entity.attributes.unit ?? entity.entity.attributes.unit_of_measurement)
            : undefined,
        durationMs: Number.isFinite(sinceMs) ? Math.max(0, now - sinceMs) : 0,
        lastUpdated: entity.entity.lastUpdated,
        sourceEntityId: entity.entity.externalId,
        scope: alertScope(entity),
      });
    }
  }
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((left, right) => rank[left.severity] - rank[right.severity]);
}
