import type { ResolvedSemanticEntity } from '../core/types';
import { buildHomeOsMappingSearchIndex } from './search-index';

export function buildHomeOsIndexes(entities: readonly ResolvedSemanticEntity[]) {
  const semanticRoleIndex = new Map<string, ResolvedSemanticEntity[]>();
  const deviceIndex = new Map<string, ResolvedSemanticEntity[]>();
  const physicalDeviceIndex = new Map<string, ResolvedSemanticEntity[]>();
  for (const item of entities) {
    for (const role of item.roles) {
      semanticRoleIndex.set(role, [...(semanticRoleIndex.get(role) ?? []), item]);
    }
    const attributes = item.entity.attributes;
    const deviceId = attributes.deviceId ?? attributes.device_id;
    if (typeof deviceId === 'string' && deviceId) {
      deviceIndex.set(deviceId, [...(deviceIndex.get(deviceId) ?? []), item]);
    }
    const physicalDeviceId = item.mapping?.physicalDeviceId;
    if (physicalDeviceId) {
      physicalDeviceIndex.set(physicalDeviceId, [
        ...(physicalDeviceIndex.get(physicalDeviceId) ?? []),
        item,
      ]);
    }
  }
  return {
    search: buildHomeOsMappingSearchIndex(entities),
    semanticRoleIndex,
    deviceIndex,
    physicalDeviceIndex,
  };
}
