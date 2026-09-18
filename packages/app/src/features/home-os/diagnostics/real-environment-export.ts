import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_CARD_REGISTRY } from '../cards/card-registry';
import type { HomeOsConfig } from '../config/schema';
import type { ResolvedSemanticEntity } from '../core/types';
import { HomeOsDataSourceResolver } from '../mapping/data-source-resolver';

const SENSITIVE_ENTITY_PATTERN = /password|token|secret|credential|authorization|cookie|api.?key/i;

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const attr = (entity: NavetEntity, ...keys: string[]) => {
  for (const key of keys) {
    const value = entity.attributes[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const safeState = (entity: NavetEntity) =>
  SENSITIVE_ENTITY_PATTERN.test(
    `${entity.externalId} ${entity.name} ${String(attr(entity, 'deviceClass', 'device_class') ?? '')}`
  )
    ? null
    : entity.primaryState;

export interface RealEnvironmentEntitySnapshot {
  entityId: string;
  canonicalId: string;
  domain: string;
  state: NavetEntity['primaryState'];
  availability: NavetEntity['availability'];
  friendlyName: string;
  deviceClass?: unknown;
  stateClass?: unknown;
  unit?: unknown;
  platform?: unknown;
  integration?: unknown;
  uniqueId?: unknown;
  deviceId?: unknown;
  deviceName?: unknown;
  manufacturer?: unknown;
  model?: unknown;
  areaId?: unknown;
  areaName?: string;
  supportedFeatures?: unknown;
  lastChanged?: unknown;
  lastUpdated?: string;
  detectedSemanticRoles: Array<{
    role: string;
    confidence: number;
    source: string;
    reasons: string[];
  }>;
  finalSemanticRoles: string[];
  mappingSource: string;
  controlPolicy: string;
  displayPolicy: string;
  ignored: boolean;
}

const snapshotEntity = (item: ResolvedSemanticEntity): RealEnvironmentEntitySnapshot => {
  const entity = item.entity;
  return {
    entityId: entity.externalId,
    canonicalId: entity.canonicalId,
    domain: entity.externalId.split('.')[0] ?? '',
    state: safeState(entity),
    availability: entity.availability,
    friendlyName: entity.name,
    deviceClass: attr(entity, 'deviceClass', 'device_class'),
    stateClass: attr(entity, 'stateClass', 'state_class'),
    unit: attr(entity, 'unit', 'unit_of_measurement'),
    platform: attr(entity, 'platform'),
    integration: attr(entity, 'integration'),
    uniqueId: attr(entity, 'uniqueId', 'unique_id'),
    deviceId: attr(entity, 'deviceId', 'device_id'),
    deviceName: attr(entity, 'deviceName', 'device_name'),
    manufacturer: attr(entity, 'manufacturer'),
    model: attr(entity, 'model'),
    areaId: attr(entity, 'areaId', 'area_id'),
    areaName: item.room,
    supportedFeatures: attr(entity, 'supportedFeatures', 'supported_features'),
    lastChanged: attr(entity, 'lastChanged', 'last_changed'),
    lastUpdated: entity.lastUpdated,
    detectedSemanticRoles: item.candidates.map((candidate) => ({
      role: candidate.role,
      confidence: candidate.confidence,
      source: candidate.source,
      reasons: candidate.reasons,
    })),
    finalSemanticRoles: item.roles,
    mappingSource: item.source,
    controlPolicy: item.controlPolicy,
    displayPolicy: item.displayMode,
    ignored: item.ignored,
  };
};

const candidateGroups = {
  studyLighting: (item: ResolvedSemanticEntity) =>
    /study|书房/i.test(`${item.room ?? ''} ${item.displayName}`) &&
    /^(light|switch|button|binary_sensor)\./.test(item.entity.externalId),
  pve: (item: ResolvedSemanticEntity) => item.roles.some((role) => role.startsWith('homelab.pve.')),
  router: (item: ResolvedSemanticEntity) =>
    item.roles.some((role) => role.startsWith('network.router.')),
  internet: (item: ResolvedSemanticEntity) =>
    item.roles.some((role) => role.startsWith('network.internet.')),
  homeAssistant: (item: ResolvedSemanticEntity) =>
    item.roles.some((role) => role.startsWith('homelab.home_assistant.')),
  electricity: (item: ResolvedSemanticEntity) =>
    item.roles.some((role) => role.startsWith('energy.electricity.')),
  gas: (item: ResolvedSemanticEntity) => item.roles.some((role) => role.startsWith('energy.gas.')),
  household: (item: ResolvedSemanticEntity) =>
    item.roles.some((role) => role.startsWith('family.')),
  airQuality: (item: ResolvedSemanticEntity) =>
    item.roles.some((role) => role.startsWith('environment.air_quality.')),
} as const;

const registryGroups = (entities: readonly RealEnvironmentEntitySnapshot[]) => {
  const groups = new Map<string, RealEnvironmentEntitySnapshot[]>();
  for (const entity of entities) {
    const key = readString(entity.deviceId) ?? `unassigned:${entity.canonicalId}`;
    groups.set(key, [...(groups.get(key) ?? []), entity]);
  }
  return [...groups.entries()].map(([deviceId, members]) => ({
    deviceId: deviceId.startsWith('unassigned:') ? null : deviceId,
    deviceName: readString(members[0]?.deviceName) ?? null,
    manufacturer: readString(members[0]?.manufacturer) ?? null,
    model: readString(members[0]?.model) ?? null,
    area: members[0]?.areaName ?? null,
    platform: readString(members[0]?.platform) ?? null,
    integration: readString(members[0]?.integration) ?? null,
    entities: members.map(({ entityId }) => entityId),
  }));
};

const mappingSummary = (entities: readonly ResolvedSemanticEntity[]) => {
  const resolver = new HomeOsDataSourceResolver(entities);
  return HOME_OS_CARD_REGISTRY.map((card) => {
    const candidates = entities.filter((item) =>
      item.roles.some((role) => card.semanticRolePrefixes.some((prefix) => role.startsWith(prefix)))
    );
    const roles = [...new Set(candidates.flatMap((item) => item.roles))].filter((role) =>
      card.semanticRolePrefixes.some((prefix) => role.startsWith(prefix))
    );
    const resolutions = roles.map((role) => resolver.resolve(role));
    const status = candidates.some((item) => item.source === 'manual')
      ? 'manual'
      : resolutions.some(({ state }) => state === 'ambiguous')
        ? 'ambiguous'
        : candidates.some((item) => item.needsReview)
          ? 'needs_review'
          : roles.length === 0
            ? card.kind === 'lunar'
              ? entities.some((item) => item.entity.externalId === 'sun.sun')
                ? 'complete'
                : 'partial'
              : 'missing'
            : resolutions.every(({ state }) => state === 'available')
              ? 'complete'
              : 'partial';
    return { card: card.kind, status, roles };
  });
};

export function buildRealEnvironmentSnapshot(
  resolved: readonly ResolvedSemanticEntity[],
  config: HomeOsConfig,
  generatedAt = new Date().toISOString()
) {
  const entities = resolved.map(snapshotEntity);
  return {
    schemaVersion: 1,
    generatedAt,
    entities,
    registryDevices: registryGroups(entities),
    suggestions: entities.map((entity) => ({
      entityId: entity.entityId,
      suggestions: entity.detectedSemanticRoles,
    })),
    mappingSummary: mappingSummary(resolved),
    analysisCandidates: Object.fromEntries(
      Object.entries(candidateGroups).map(([name, predicate]) => [
        name,
        resolved.filter(predicate).map((item) => item.entity.externalId),
      ])
    ),
    manualMappings: config.mappings.map((mapping) => ({
      entityId: mapping.entityId,
      semanticRoles: mapping.semanticRoles ?? [],
      displayName: mapping.displayName,
      roomOverride: mapping.roomOverride,
      physicalDeviceId: mapping.physicalDeviceId,
      ignored: mapping.ignored === true,
      controlPolicy: mapping.controlPolicy,
    })),
    functionalDevices: config.functionalDevices ?? [],
  };
}

export function serializeRealEnvironmentSnapshot(
  resolved: readonly ResolvedSemanticEntity[],
  config: HomeOsConfig,
  generatedAt?: string
) {
  return JSON.stringify(buildRealEnvironmentSnapshot(resolved, config, generatedAt), null, 2);
}

const section = (title: string, items: readonly string[]) =>
  `## ${title}\n\n${items.length ? items.map((item) => `- ${item}`).join('\n') : '- None'}\n`;

export function serializeRealEnvironmentReport(
  resolved: readonly ResolvedSemanticEntity[],
  config: HomeOsConfig,
  generatedAt = new Date().toISOString()
) {
  const snapshot = buildRealEnvironmentSnapshot(resolved, config, generatedAt);
  const byPrefix = (prefix: string) =>
    resolved
      .filter((item) => item.roles.some((role) => role.startsWith(prefix)))
      .map((item) => `${item.displayName} (${item.entity.externalId}) -> ${item.roles.join(', ')}`);
  const report = [
    '# Home OS Real Environment Report',
    '',
    `Generated: ${generatedAt}`,
    '',
    section('Overview', [
      `${snapshot.entities.length} entities`,
      `${snapshot.registryDevices.length} Registry device groups`,
      `${snapshot.manualMappings.length} manual mappings`,
    ]),
    section(
      'Needs Review',
      resolved.filter((item) => item.needsReview).map((item) => item.entity.externalId)
    ),
    section(
      'Manual Mappings',
      resolved.filter((item) => item.source === 'manual').map((item) => item.entity.externalId)
    ),
    section(
      'Unrecognized Entities',
      resolved.filter((item) => item.roles.length === 0).map((item) => item.entity.externalId)
    ),
    section('Lighting', byPrefix('lighting.')),
    section('PVE', byPrefix('homelab.pve.')),
    section('Router', byPrefix('network.router.')),
    section('Internet', byPrefix('network.internet.')),
    section('Home Assistant', byPrefix('homelab.home_assistant.')),
    section('Electricity', byPrefix('energy.electricity.')),
    section('Gas', byPrefix('energy.gas.')),
    section('Household', byPrefix('family.')),
    section('Air Quality', byPrefix('environment.air_quality.')),
  ].join('\n');
  return report;
}
