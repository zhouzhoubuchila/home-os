import type { HomeOsAlertRuleConfig } from '../config/schema';

export type AlertSeverity = HomeOsAlertRuleConfig['severity'];

export interface HomeOsAlert {
  id: string;
  ruleId: string;
  entityId: string;
  severity: AlertSeverity;
  message: string;
  activeSince: string;
}
