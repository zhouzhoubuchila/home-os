import { migrateHomeOsConfig } from './migrations';
import type { HomeOsConfig } from './schema';

const MAX_IMPORT_BYTES = 1_000_000;

export function exportHomeOsConfig(config: HomeOsConfig): string {
  const safe: HomeOsConfig = {
    schemaVersion: config.schemaVersion,
    revision: config.revision,
    updatedAt: config.updatedAt,
    mappings: config.mappings,
    physicalDevices: config.physicalDevices,
    functionalDevices: config.functionalDevices ?? [],
    alertRules: config.alertRules,
    cardPreferences: config.cardPreferences,
  };
  return JSON.stringify(safe, null, 2);
}

export function importHomeOsConfig(serialized: string): HomeOsConfig {
  if (new TextEncoder().encode(serialized).byteLength > MAX_IMPORT_BYTES) {
    throw new Error('Home OS configuration exceeds the 1 MB import limit');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Home OS configuration is not valid JSON');
  }
  return migrateHomeOsConfig(parsed);
}
