import { describe, expect, it } from 'vitest';
import { exportHomeOsConfig, importHomeOsConfig } from '../config/export-import';
import { migrateHomeOsConfig } from '../config/migrations';
import { isHomeOsConfig } from '../config/schema';

describe('Home OS configuration', () => {
  it('migrates legacy entity role mappings', () => {
    const migrated = migrateHomeOsConfig(
      { schemaVersion: 1, mappings: { 'switch.lamp': 'lighting.switch' } },
      '2026-09-01T00:00:00.000Z'
    );
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.mappings[0]?.semanticRoles).toEqual(['lighting.switch']);
  });

  it('exports only the configuration allowlist and rejects invalid imports', () => {
    const config = migrateHomeOsConfig({ schemaVersion: 1, mappings: {} });
    const exported = exportHomeOsConfig({ ...config, token: 'secret' } as typeof config & {
      token: string;
    });
    expect(exported).not.toContain('secret');
    expect(() => importHomeOsConfig('{bad')).toThrow('valid JSON');
  });
});

it('rejects malformed nested mappings', () => {
  expect(
    isHomeOsConfig({
      schemaVersion: 2,
      revision: 0,
      updatedAt: '2026-09-01T00:00:00.000Z',
      mappings: [{ schemaVersion: 2, entityId: 'light.bad', source: 'manual' }],
      physicalDevices: [],
      alertRules: [],
      cardPreferences: {},
    })
  ).toBe(false);
});
