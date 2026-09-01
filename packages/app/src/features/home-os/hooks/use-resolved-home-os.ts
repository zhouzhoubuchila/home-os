import { useIntegrationStore } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { useHomeOsConfigStore } from '../stores/home-os-config-store';

let cachedEntityRecord: ReturnType<
  typeof integrationSelectors.providerEntitiesByCanonicalId
> | null = null;
let cachedMappings: ReturnType<typeof useHomeOsConfigStore.getState>['config']['mappings'] | null =
  null;
let cachedResolved: ReturnType<typeof resolveSemanticEntities> = [];

function resolveSharedModel(
  entitiesById: ReturnType<typeof integrationSelectors.providerEntitiesByCanonicalId>,
  mappings: ReturnType<typeof useHomeOsConfigStore.getState>['config']['mappings']
) {
  if (entitiesById === cachedEntityRecord && mappings === cachedMappings) return cachedResolved;
  cachedEntityRecord = entitiesById;
  cachedMappings = mappings;
  cachedResolved = resolveSemanticEntities(Object.values(entitiesById), mappings);
  return cachedResolved;
}

export function useResolvedHomeOsEntities() {
  const entitiesById = useIntegrationStore(
    useShallow(integrationSelectors.providerEntitiesByCanonicalId)
  );
  const { config, loaded, load } = useHomeOsConfigStore();
  useEffect(() => {
    if (!loaded) void load();
  }, [load, loaded]);
  return useMemo(
    () => resolveSharedModel(entitiesById, config.mappings),
    [config.mappings, entitiesById]
  );
}
