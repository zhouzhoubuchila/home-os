import type { HomeOsAlertRuleConfig } from '../config/schema';

export type AlertSeverity = HomeOsAlertRuleConfig['severity'];

export interface HomeOsAlert {
  id: string;
  ruleId: string;
  entityId: string;
  severity: AlertSeverity;
  message: string;
  activeSince: string;
  deviceName: string;
  room?: string;
  currentValue: unknown;
  unit?: string;
  durationMs: number;
  lastUpdated?: string;
  sourceEntityId: string;
}
