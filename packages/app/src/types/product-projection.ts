import type { IntegrationProviderId } from './provider';

export interface ProductProjectionMetadata {
  projectionId: string;
  sourceEntityIds: string[];
  providerId?: IntegrationProviderId;
  semanticSource: string;
  commandTargets: Record<string, string[]>;
}
