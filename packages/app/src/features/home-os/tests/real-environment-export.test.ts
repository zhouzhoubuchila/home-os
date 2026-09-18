import { describe, expect, it } from 'vitest';
import { createDefaultHomeOsConfig } from '../config/schema';
import {
  serializeRealEnvironmentReport,
  serializeRealEnvironmentSnapshot,
} from '../diagnostics/real-environment-export';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('real environment diagnostics export', () => {
  const resolved = resolveSemanticEntities([
    homeOsEntity({
      externalId: 'switch.study_switch',
      name: 'Study switch',
      room: 'Study',
      attributes: {
        deviceId: 'study-wall-device',
        deviceName: 'Study wall switch',
        platform: 'mqtt',
        uniqueId: 'study-relay-1',
        access_token: 'must-not-export',
      },
    }),
    homeOsEntity({
      externalId: 'sensor.study_power',
      name: 'Study power',
      room: 'Study',
      primaryState: 18,
      attributes: { deviceId: 'study-wall-device', unit: 'W' },
    }),
    homeOsEntity({
      externalId: 'sensor.private_token',
      name: 'API token',
      primaryState: 'super-secret-value',
      attributes: { deviceId: 'credentials' },
    }),
  ]);

  it('groups Registry devices and includes non-persisted suggestions', () => {
    const exported = JSON.parse(
      serializeRealEnvironmentSnapshot(
        resolved,
        createDefaultHomeOsConfig(),
        '2026-09-18T00:00:00Z'
      )
    );

    expect(exported.registryDevices).toContainEqual(
      expect.objectContaining({
        deviceId: 'study-wall-device',
        entities: ['switch.study_switch', 'sensor.study_power'],
      })
    );
    expect(exported.analysisCandidates.studyLighting).toContain('switch.study_switch');
    expect(exported.suggestions[0]).toEqual(
      expect.objectContaining({ entityId: 'switch.study_switch' })
    );
    expect(
      exported.entities.find(
        ({ entityId }: { entityId: string }) => entityId === 'sensor.private_token'
      ).state
    ).toBeNull();
  });

  it('does not export credentials in JSON or Markdown', () => {
    const config = createDefaultHomeOsConfig();
    const json = serializeRealEnvironmentSnapshot(resolved, config);
    const markdown = serializeRealEnvironmentReport(resolved, config);

    expect(json).not.toContain('must-not-export');
    expect(json).not.toContain('super-secret-value');
    expect(json).not.toMatch(/access_token|authorization|cookie|password/i);
    expect(markdown).not.toContain('super-secret-value');
    expect(markdown).toContain('## Needs Review');
    expect(markdown).toContain('## Air Quality');
  });
});
