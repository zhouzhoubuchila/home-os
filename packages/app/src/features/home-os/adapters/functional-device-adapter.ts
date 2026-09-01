import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';

export interface ResolvedHomeOsFunctionalDevice extends HomeOsFunctionalDevice {
  entities: ResolvedSemanticEntity[];
  missingEntityIds: string[];
}

export function resolveFunctionalDevices(
  configs: readonly HomeOsFunctionalDevice[],
  entities: readonly ResolvedSemanticEntity[]
): ResolvedHomeOsFunctionalDevice[] {
  const byExternalId = new Map(entities.map((item) => [item.entity.externalId, item]));
  return configs.map((config) => {
    const referencedIds = new Set([
      ...config.sourceEntityIds,
      ...(config.stateEntityId ? [config.stateEntityId] : []),
      ...Object.values(config.controls ?? {}).filter((value): value is string => Boolean(value)),
      ...Object.values(config.metrics),
    ]);
    const members = [...referencedIds]
      .map((entityId) => byExternalId.get(entityId))
      .filter((item): item is ResolvedSemanticEntity => Boolean(item));
    return {
      ...config,
      entities: members,
      missingEntityIds: [...referencedIds].filter((entityId) => !byExternalId.has(entityId)),
    };
  });
}
