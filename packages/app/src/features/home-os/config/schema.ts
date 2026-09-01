import type { HomeOsFunctionalDevice, ManualEntityMapping } from '../core/types';

export const HOME_OS_CONFIG_SCHEMA_VERSION = 2 as const;

export interface HomeOsPhysicalDeviceConfig {
  id: string;
  name: string;
  category: string;
  room?: string;
  entityIds: string[];
}

export interface HomeOsAlertRuleConfig {
  id: string;
  enabled: boolean;
  semanticRole?: string;
  entityId?: string;
  condition:
    | { type: 'state'; equals: string }
    | { type: 'numeric'; operator: 'lt' | 'lte' | 'gt' | 'gte'; value: number }
    | { type: 'availability'; equals: 'unavailable' | 'unknown' };
  durationMs?: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface HomeOsConfig {
  schemaVersion: typeof HOME_OS_CONFIG_SCHEMA_VERSION;
  revision: number;
  updatedAt: string;
  mappings: ManualEntityMapping[];
  physicalDevices: HomeOsPhysicalDeviceConfig[];
  functionalDevices?: HomeOsFunctionalDevice[];
  alertRules: HomeOsAlertRuleConfig[];
  cardPreferences: Record<string, { hidden?: boolean; size?: 'small' | 'medium' | 'large' }>;
}

export function createDefaultHomeOsConfig(now = new Date().toISOString()): HomeOsConfig {
  return {
    schemaVersion: HOME_OS_CONFIG_SCHEMA_VERSION,
    revision: 0,
    updatedAt: now,
    mappings: [],
    physicalDevices: [],
    functionalDevices: [],
    alertRules: [],
    cardPreferences: {},
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';
const isStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

function isManualMapping(value: unknown): value is ManualEntityMapping {
  if (!isRecord(value)) return false;
  if (
    value.schemaVersion !== HOME_OS_CONFIG_SCHEMA_VERSION ||
    typeof value.entityId !== 'string' ||
    value.source !== 'manual' ||
    typeof value.updatedAt !== 'string'
  ) {
    return false;
  }
  if (value.semanticRoles !== undefined && !isStringArray(value.semanticRoles)) return false;
  for (const key of [
    'displayName',
    'roomOverride',
    'physicalDeviceId',
    'familyPersonId',
  ] as const) {
    if (!isOptionalString(value[key])) return false;
  }
  if (value.stableRef !== undefined) {
    if (!isRecord(value.stableRef)) return false;
    for (const key of ['canonicalId', 'deviceId', 'providerId', 'uniqueId'] as const) {
      if (!isOptionalString(value.stableRef[key])) return false;
    }
  }
  if (value.hidden !== undefined && typeof value.hidden !== 'boolean') return false;
  if (value.ignored !== undefined && typeof value.ignored !== 'boolean') return false;
  if (
    value.displayMode !== undefined &&
    !['primary', 'detail', 'diagnostic', 'hidden'].includes(String(value.displayMode))
  ) {
    return false;
  }
  return (
    value.controlPolicy === undefined ||
    ['direct', 'confirm', 'dangerous', 'readonly'].includes(String(value.controlPolicy))
  );
}

function isPhysicalDevice(value: unknown): value is HomeOsPhysicalDeviceConfig {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    isOptionalString(value.room) &&
    isStringArray(value.entityIds)
  );
}

function isFunctionalDevice(value: unknown): value is HomeOsFunctionalDevice {
  if (!isRecord(value) || !isRecord(value.metrics)) return false;
  const controls = value.controls;
  return (
    typeof value.id === 'string' &&
    [
      'light',
      'router',
      'pve',
      'energy_meter',
      'gas_account',
      'person',
      'vacuum',
      'appliance',
    ].includes(String(value.kind)) &&
    typeof value.name === 'string' &&
    isOptionalString(value.room) &&
    isOptionalString(value.stateEntityId) &&
    isStringArray(value.sourceEntityIds) &&
    Object.values(value.metrics).every((entry) => typeof entry === 'string') &&
    (controls === undefined ||
      (isRecord(controls) &&
        ['on', 'off', 'toggle', 'brightness', 'colorTemperature', 'color'].every((key) =>
          isOptionalString(controls[key])
        ))) &&
    (value.manual === undefined || typeof value.manual === 'boolean')
  );
}

function isAlertRule(value: unknown): value is HomeOsAlertRuleConfig {
  if (!isRecord(value) || !isRecord(value.condition)) return false;
  const condition = value.condition;
  const validCondition =
    (condition.type === 'state' && typeof condition.equals === 'string') ||
    (condition.type === 'availability' &&
      ['unavailable', 'unknown'].includes(String(condition.equals))) ||
    (condition.type === 'numeric' &&
      ['lt', 'lte', 'gt', 'gte'].includes(String(condition.operator)) &&
      typeof condition.value === 'number' &&
      Number.isFinite(condition.value));
  return (
    typeof value.id === 'string' &&
    typeof value.enabled === 'boolean' &&
    isOptionalString(value.semanticRole) &&
    isOptionalString(value.entityId) &&
    validCondition &&
    (value.durationMs === undefined ||
      (typeof value.durationMs === 'number' &&
        Number.isFinite(value.durationMs) &&
        value.durationMs >= 0)) &&
    ['info', 'warning', 'critical'].includes(String(value.severity)) &&
    typeof value.message === 'string'
  );
}

export function isHomeOsConfig(value: unknown): value is HomeOsConfig {
  if (!isRecord(value) || value.schemaVersion !== HOME_OS_CONFIG_SCHEMA_VERSION) return false;
  if (!Number.isInteger(value.revision) || typeof value.updatedAt !== 'string') return false;
  if (!Array.isArray(value.mappings) || !Array.isArray(value.physicalDevices)) return false;
  if (!Array.isArray(value.alertRules) || !isRecord(value.cardPreferences)) return false;
  if (
    value.functionalDevices !== undefined &&
    (!Array.isArray(value.functionalDevices) || !value.functionalDevices.every(isFunctionalDevice))
  ) {
    return false;
  }
  if (!value.mappings.every(isManualMapping) || !value.physicalDevices.every(isPhysicalDevice)) {
    return false;
  }
  if (!value.alertRules.every(isAlertRule)) return false;
  return Object.values(value.cardPreferences).every(
    (preference) =>
      isRecord(preference) &&
      (preference.hidden === undefined || typeof preference.hidden === 'boolean') &&
      (preference.size === undefined ||
        ['small', 'medium', 'large'].includes(String(preference.size)))
  );
}
