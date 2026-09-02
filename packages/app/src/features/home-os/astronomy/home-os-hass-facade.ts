import type { ResolvedSemanticEntity } from '../core/types';

export interface HomeOsHassState {
  state: string;
  attributes: Record<string, unknown>;
  lastUpdated?: string;
}

/** Minimal provider-neutral surface required by the adapted Sun Position Card algorithms. */
export class HomeOsHassFacade {
  private readonly states: Map<string, HomeOsHassState>;

  constructor(entities: readonly ResolvedSemanticEntity[]) {
    this.states = new Map(
      entities.map(({ entity }) => [
        entity.externalId,
        {
          state: String(entity.primaryState ?? 'unknown'),
          attributes: entity.attributes,
          lastUpdated: entity.lastUpdated,
        },
      ])
    );
  }

  getState(entityId: string) {
    return this.states.get(entityId);
  }
}
