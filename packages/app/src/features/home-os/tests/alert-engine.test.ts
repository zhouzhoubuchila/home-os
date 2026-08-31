import { describe, expect, it } from 'vitest';
import { evaluateAlerts } from '../alerts/alert-engine';
import { DEFAULT_HOME_OS_ALERT_RULES } from '../alerts/default-rules';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveSemanticEntity } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

const mapping = (entityId: string, role: string): ManualEntityMapping => ({
  schemaVersion: 2,
  entityId,
  semanticRoles: [role],
  source: 'manual',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

describe('alert engine', () => {
  it('does not alert immediately for a transient unavailable entity', () => {
    const rule = {
      id: 'unavailable',
      enabled: true,
      entityId: 'sensor.sample',
      condition: { type: 'availability' as const, equals: 'unavailable' as const },
      durationMs: 180_000,
      severity: 'warning' as const,
      message: 'Unavailable',
    };
    const entity = resolveSemanticEntity(
      homeOsEntity({ availability: 'unavailable', lastUpdated: '2026-09-01T00:02:00.000Z' })
    );
    expect(evaluateAlerts([entity], [rule], Date.parse('2026-09-01T00:03:00.000Z'))).toEqual([]);
  });

  it('raises low battery and duration-qualified PVE temperature warnings', () => {
    const battery = resolveSemanticEntity(
      homeOsEntity({ externalId: 'sensor.battery', primaryState: 5 }),
      [mapping('sensor.battery', HOME_OS_ROLES.diagnosticBattery)]
    );
    const pve = resolveSemanticEntity(
      homeOsEntity({
        externalId: 'sensor.pve_temperature',
        primaryState: 85,
        lastUpdated: '2026-09-01T00:00:00.000Z',
      }),
      [mapping('sensor.pve_temperature', HOME_OS_ROLES.homelabPveTemperature)]
    );
    const alerts = evaluateAlerts(
      [battery, pve],
      DEFAULT_HOME_OS_ALERT_RULES,
      Date.parse('2026-09-01T00:06:00.000Z')
    );
    expect(alerts.map(({ ruleId }) => ruleId)).toEqual(['battery-low', 'pve-temperature']);
  });

  it('does not treat a normal connectivity sensor being on as an incident', () => {
    const entity = resolveSemanticEntity(
      homeOsEntity({ externalId: 'binary_sensor.connectivity', primaryState: 'on' }),
      [mapping('binary_sensor.connectivity', HOME_OS_ROLES.diagnosticConnectivity)]
    );
    expect(evaluateAlerts([entity], DEFAULT_HOME_OS_ALERT_RULES)).toEqual([]);
  });
});
