import type { HomeOsAlertRuleConfig } from '../config/schema';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import { getHomeOsCopy, HOME_OS_COPY } from '../i18n/home-os-copy';

export const DEFAULT_HOME_OS_ALERT_RULES: readonly HomeOsAlertRuleConfig[] = [
  {
    id: 'water-leak',
    enabled: true,
    semanticRole: HOME_OS_ROLES.securityWaterLeak,
    condition: { type: 'state', equals: 'on' },
    severity: 'critical',
    message: HOME_OS_COPY.waterLeakDetected,
  },
  {
    id: 'smoke',
    enabled: true,
    semanticRole: HOME_OS_ROLES.securitySmoke,
    condition: { type: 'state', equals: 'on' },
    severity: 'critical',
    message: HOME_OS_COPY.smokeDetected,
  },
  {
    id: 'door-open',
    enabled: true,
    semanticRole: HOME_OS_ROLES.securityDoor,
    condition: { type: 'state', equals: 'on' },
    durationMs: 10 * 60_000,
    severity: 'warning',
    message: HOME_OS_COPY.doorOpen,
  },
  {
    id: 'battery-low',
    enabled: true,
    semanticRole: HOME_OS_ROLES.diagnosticBattery,
    condition: { type: 'numeric', operator: 'lt', value: 10 },
    severity: 'warning',
    message: HOME_OS_COPY.batteryLow,
  },
  {
    id: 'pve-temperature',
    enabled: true,
    semanticRole: HOME_OS_ROLES.homelabPveTemperature,
    condition: { type: 'numeric', operator: 'gt', value: 80 },
    durationMs: 5 * 60_000,
    severity: 'warning',
    message: HOME_OS_COPY.pveTemperatureHigh,
  },
];

export function getDefaultHomeOsAlertRules(language: string): readonly HomeOsAlertRuleConfig[] {
  const copy = getHomeOsCopy(language);
  const messages: Record<string, string> = {
    'water-leak': copy.waterLeakDetected,
    smoke: copy.smokeDetected,
    'door-open': copy.doorOpen,
    'battery-low': copy.batteryLow,
    'pve-temperature': copy.pveTemperatureHigh,
  };
  return DEFAULT_HOME_OS_ALERT_RULES.map((rule) => ({
    ...rule,
    message: messages[rule.id] ?? rule.message,
  }));
}
