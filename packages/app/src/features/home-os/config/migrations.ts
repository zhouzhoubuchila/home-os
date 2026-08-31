import {
  createDefaultHomeOsConfig,
  HOME_OS_CONFIG_SCHEMA_VERSION,
  type HomeOsConfig,
  isHomeOsConfig,
} from './schema';

type LegacyConfig = {
  schemaVersion?: 1;
  mappings?: Record<string, string | string[]>;
};

export function migrateHomeOsConfig(value: unknown, now = new Date().toISOString()): HomeOsConfig {
  if (isHomeOsConfig(value)) return value;
  if (!value || typeof value !== 'object') return createDefaultHomeOsConfig(now);
  const legacy = value as LegacyConfig;
  if (legacy.schemaVersion !== 1 || !legacy.mappings || typeof legacy.mappings !== 'object') {
    throw new Error('Unsupported Home OS configuration schema');
  }

  return {
    ...createDefaultHomeOsConfig(now),
    schemaVersion: HOME_OS_CONFIG_SCHEMA_VERSION,
    mappings: Object.entries(legacy.mappings).map(([entityId, roles]) => ({
      schemaVersion: HOME_OS_CONFIG_SCHEMA_VERSION,
      entityId,
      semanticRoles: Array.isArray(roles) ? roles : [roles],
      source: 'manual',
      updatedAt: now,
    })),
  };
}
