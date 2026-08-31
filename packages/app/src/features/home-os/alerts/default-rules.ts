import type { HomeOsAlertRuleConfig } from '../config/schema';
import { HOME_OS_ROLES } from '../core/semantic-roles';

export const DEFAULT_HOME_OS_ALERT_RULES: readonly HomeOsAlertRuleConfig[] = [
  {
    id: 'water-leak',
    enabled: true,
    semanticRole: HOME_OS_ROLES.securityWaterLeak,
    condition: { type: 'state', equals: 'on' },
    severity: 'critical',
    message: 'Water leak detected',
  },
  {
    id: 'smoke',
    enabled: true,
    semanticRole: HOME_OS_ROLES.securitySmoke,
    condition: { type: 'state', equals: 'on' },
    severity: 'critical',
    message: 'Smoke detected',
  },
  {
    id: 'door-open',
    enabled: true,
    semanticRole: HOME_OS_ROLES.securityDoor,
    condition: { type: 'state', equals: 'on' },
    durationMs: 10 * 60_000,
    severity: 'warning',
    message: 'Door has been open for 10 minutes',
  },
  {
    id: 'battery-low',
    enabled: true,
    semanticRole: HOME_OS_ROLES.diagnosticBattery,
    condition: { type: 'numeric', operator: 'lt', value: 10 },
    severity: 'warning',
    message: 'Battery is low',
  },
  {
    id: 'pve-temperature',
    enabled: true,
    semanticRole: HOME_OS_ROLES.homelabPveTemperature,
    condition: { type: 'numeric', operator: 'gt', value: 80 },
    durationMs: 5 * 60_000,
    severity: 'warning',
    message: 'PVE temperature is high',
  },
];
