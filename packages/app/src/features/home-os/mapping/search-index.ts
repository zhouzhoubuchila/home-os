import type { ResolvedSemanticEntity } from '../core/types';

export interface HomeOsMappingSearchIndex {
  search(query: string): ResolvedSemanticEntity[];
  size: number;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const SAFE_ATTRIBUTE_KEYS = [
  'deviceName',
  'device_name',
  'manufacturer',
  'model',
  'integration',
  'platform',
  'viaDeviceName',
  'via_device_name',
  'area',
  'areaName',
  'friendly_name',
] as const;

export function buildHomeOsMappingSearchIndex(
  entities: readonly ResolvedSemanticEntity[]
): HomeOsMappingSearchIndex {
  const base = entities.map((item) => {
    const attributes = item.entity.attributes;
    const searchable = [
      item.entity.externalId,
      item.displayName,
      item.entity.name,
      item.room,
      item.mapping?.physicalDeviceId,
      ...item.roles,
      ...SAFE_ATTRIBUTE_KEYS.map((key) => text(attributes[key])),
    ]
      .filter(Boolean)
      .join('\u0000')
      .toLocaleLowerCase();
    const deviceKey = text(attributes.deviceId ?? attributes.device_id);
    return { item, searchable, deviceKey };
  });
  const deviceContexts = new Map<string, string>();
  for (const entry of base) {
    if (!entry.deviceKey) continue;
    deviceContexts.set(
      entry.deviceKey,
      `${deviceContexts.get(entry.deviceKey) ?? ''}\u0000${entry.searchable}`
    );
  }
  const indexed = base.map((entry) => ({
    item: entry.item,
    searchable: `${entry.searchable}\u0000${deviceContexts.get(entry.deviceKey) ?? ''}`,
  }));

  return {
    size: indexed.length,
    search(query) {
      const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      if (!tokens.length) return indexed.map(({ item }) => item);
      return indexed
        .filter(({ searchable }) => tokens.every((token) => searchable.includes(token)))
        .map(({ item }) => item);
    },
  };
}
