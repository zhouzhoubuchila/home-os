import { useMemo } from 'react';
import { buildHomeOsProductProjection } from '../projection/product-path-projection';
import { useHomeOsConfigStore } from '../stores/home-os-config-store';
import { useResolvedHomeOsEntities } from './use-resolved-home-os';

export function useHomeOsProductProjection() {
  const entities = useResolvedHomeOsEntities();
  const functionalDevices = useHomeOsConfigStore((state) => state.config.functionalDevices);
  const physicalDevices = useHomeOsConfigStore((state) => state.config.physicalDevices);

  return useMemo(
    () => buildHomeOsProductProjection({ entities, functionalDevices, physicalDevices }),
    [entities, functionalDevices, physicalDevices]
  );
}
