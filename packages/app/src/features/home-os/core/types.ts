import type { NavetCapabilityId } from '@navet/core/capabilities';
import type { NavetEntity } from '@navet/core/types';
import type { SemanticRole } from './semantic-roles';

export type MappingSource =
  | 'manual'
  | 'explicit_metadata'
  | 'registry_metadata'
  | 'device_metadata'
  | 'integration'
  | 'domain'
  | 'name_heuristic'
  | 'regex_fallback'
  | 'unmapped';

export type DisplayMode = 'primary' | 'detail' | 'diagnostic' | 'hidden';
export type ControlPolicy = 'direct' | 'confirm' | 'dangerous' | 'readonly';
export type MappingReviewDisposition = 'mapped' | 'review' | 'unmapped' | 'diagnostic' | 'ignored';

export interface StableEntityRef {
  canonicalId?: string;
  deviceId?: string;
  providerId?: string;
  uniqueId?: string;
}

export interface ManualEntityMapping {
  schemaVersion: 2;
  entityId: string;
  stableRef?: StableEntityRef;
  semanticRoles?: SemanticRole[];
  displayName?: string;
  roomOverride?: string;
  physicalDeviceId?: string;
  familyPersonId?: string;
  hidden?: boolean;
  ignored?: boolean;
  displayMode?: DisplayMode;
  controlPolicy?: ControlPolicy;
  source: 'manual';
  updatedAt: string;
}

export interface SemanticCandidate {
  role: SemanticRole;
  confidence: number;
  reasons: string[];
  source: Exclude<MappingSource, 'manual' | 'unmapped'>;
}

export interface ResolvedSemanticEntity {
  entity: NavetEntity;
  candidates: SemanticCandidate[];
  roles: SemanticRole[];
  confidence: number;
  reasons: string[];
  source: MappingSource;
  mapping?: ManualEntityMapping;
  displayName: string;
  room?: string;
  displayMode: DisplayMode;
  controlPolicy: ControlPolicy;
  ignored: boolean;
  needsReview: boolean;
  reviewDisposition: MappingReviewDisposition;
}

export interface HomeOsMetric {
  role: SemanticRole;
  value: NavetEntity['primaryState'];
  unit?: string;
  updatedAt?: string;
  stale: boolean;
  available: boolean;
  sourceEntityId: string;
}

export type MetricResolutionState =
  | 'available'
  | 'capability_absent'
  | 'unmapped'
  | 'ambiguous'
  | 'unavailable'
  | 'stale';

export interface MetricResolutionCandidate {
  entityId: string;
  confidence: number;
  reasons: string[];
}

export interface MetricResolution {
  role: SemanticRole;
  state: MetricResolutionState;
  mappedEntityId?: string;
  candidates?: MetricResolutionCandidate[];
  reason?: string;
  value?: NavetEntity['primaryState'];
  unit?: string;
  updatedAt?: string;
}

export type HomeOsFunctionalDeviceKind =
  | 'light'
  | 'router'
  | 'pve'
  | 'energy_meter'
  | 'gas_account'
  | 'person'
  | 'vacuum'
  | 'appliance';

export interface HomeOsFunctionalDevice {
  id: string;
  kind: HomeOsFunctionalDeviceKind;
  name: string;
  room?: string;
  stateEntityId?: string;
  controls?: {
    on?: string;
    off?: string;
    toggle?: string;
    brightness?: string;
    colorTemperature?: string;
    color?: string;
  };
  metrics: Record<string, string>;
  sourceEntityIds: string[];
  manual?: boolean;
}

export interface HomeOsPhysicalDevice {
  id: string;
  name: string;
  category: string;
  room?: string;
  state: 'online' | 'offline' | 'unknown';
  freshness: 'fresh' | 'stale' | 'unavailable';
  health: 'normal' | 'warning' | 'critical' | 'unknown';
  lastMeaningfulUpdate?: string;
  semanticMetrics: Partial<Record<SemanticRole, HomeOsMetric>>;
  capabilities: NavetCapabilityId[];
  entityIds: string[];
}
