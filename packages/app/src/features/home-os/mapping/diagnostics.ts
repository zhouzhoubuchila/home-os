import { HOME_OS_CARD_REGISTRY, type HomeOsCardKind } from '../cards/card-registry';
import { HOME_OS_ROLES, type SemanticRole } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';
import { HomeOsDataSourceResolver } from './data-source-resolver';

export interface HomeOsEntityDiagnostic {
  entityId: string;
  providerId: string;
  detectedRoles: Array<{
    role: SemanticRole;
    confidence: number;
    source: string;
    reasons: string[];
  }>;
  finalRoles: SemanticRole[];
  finalSource: string;
  usedByCards: HomeOsCardKind[];
}

export interface HomeOsCardDiagnostic {
  card: HomeOsCardKind;
  matchedRoles: SemanticRole[];
  selectedEntities: Array<{ role: SemanticRole; entityId: string }>;
  missingRequiredRoles: string[];
}

export interface HomeOsDiagnostics {
  entities: HomeOsEntityDiagnostic[];
  cards: HomeOsCardDiagnostic[];
  ambiguousRoles: Array<{ role: SemanticRole; entityIds: string[] }>;
}

const matchesPrefix = (role: SemanticRole, prefix: string) => role.startsWith(prefix);

const isAstronomyEntity = (entityId: string) =>
  ['sun', 'moon'].includes(entityId.split('.')[0] ?? '') || entityId === 'sensor.moon_phase';

const cardsForEntity = (item: ResolvedSemanticEntity) =>
  HOME_OS_CARD_REGISTRY.filter(
    (definition) =>
      (definition.kind === 'lunar' && isAstronomyEntity(item.entity.externalId)) ||
      item.roles.some((role) =>
        definition.semanticRolePrefixes.some((prefix) => matchesPrefix(role, prefix))
      )
  ).map(({ kind }) => kind);

export function buildHomeOsDiagnostics(
  entities: readonly ResolvedSemanticEntity[]
): HomeOsDiagnostics {
  const visible = entities.filter((item) => !item.ignored && item.displayMode !== 'hidden');
  const resolver = new HomeOsDataSourceResolver(visible);
  const knownRoles: SemanticRole[] = [...new Set(Object.values(HOME_OS_ROLES))];
  const resolutions = new Map(knownRoles.map((role) => [role, resolver.resolve(role)]));

  const cards = HOME_OS_CARD_REGISTRY.map((definition): HomeOsCardDiagnostic => {
    if (definition.kind === 'lunar') {
      const astronomy = visible.filter((item) => isAstronomyEntity(item.entity.externalId));
      return {
        card: definition.kind,
        matchedRoles: astronomy.map((item) => `astronomy.${item.entity.externalId.split('.')[0]}`),
        selectedEntities: astronomy.map((item) => ({
          role: `astronomy.${item.entity.externalId.split('.')[0]}`,
          entityId: item.entity.externalId,
        })),
        missingRequiredRoles: astronomy.some((item) => item.entity.externalId === 'sun.sun')
          ? []
          : ['sun.sun'],
      };
    }
    const matchedRoles = [
      ...new Set(
        visible.flatMap((item) =>
          item.roles.filter((role) =>
            definition.semanticRolePrefixes.some((prefix) => matchesPrefix(role, prefix))
          )
        )
      ),
    ];
    const selectedEntities = matchedRoles.flatMap((role) => {
      const resolution = resolutions.get(role);
      return resolution?.state === 'available' && resolution.selected
        ? [{ role, entityId: resolution.selected.sourceId }]
        : [];
    });
    const missingRequiredRoles = definition.semanticRolePrefixes.filter(
      (prefix) => !matchedRoles.some((role) => matchesPrefix(role, prefix))
    );
    return { card: definition.kind, matchedRoles, selectedEntities, missingRequiredRoles };
  });

  return {
    entities: entities.map((item) => ({
      entityId: item.entity.externalId,
      providerId: item.entity.providerId,
      detectedRoles: item.candidates.map((candidate) => ({
        role: candidate.role,
        confidence: candidate.confidence,
        source: candidate.source,
        reasons: candidate.reasons,
      })),
      finalRoles: item.roles,
      finalSource: item.source,
      usedByCards: cardsForEntity(item),
    })),
    cards,
    ambiguousRoles: knownRoles.flatMap((role) => {
      const resolution = resolutions.get(role);
      return resolution?.state === 'ambiguous'
        ? [{ role, entityIds: resolution.candidates.map(({ sourceId }) => sourceId) }]
        : [];
    }),
  };
}

export function exposeHomeOsDiagnostics(diagnostics: HomeOsDiagnostics) {
  const target = globalThis as typeof globalThis & {
    __NAVET_HOME_OS_DIAGNOSTICS__?: HomeOsDiagnostics;
  };
  target.__NAVET_HOME_OS_DIAGNOSTICS__ = diagnostics;
}
