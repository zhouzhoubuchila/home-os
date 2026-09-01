import type { NavetEntity } from '@navet/core/types';

export function homeOsEntity(overrides: Partial<NavetEntity> = {}): NavetEntity {
  const externalId = overrides.externalId ?? 'sensor.example';
  return {
    id: overrides.id ?? `home_assistant:${externalId}`,
    canonicalId: overrides.canonicalId ?? `home_assistant:${externalId}`,
    providerId: overrides.providerId ?? 'home_assistant',
    externalId,
    type: overrides.type ?? 'sensor',
    name: overrides.name ?? externalId,
    room: overrides.room ?? 'Home',
    primaryState: overrides.primaryState ?? 'on',
    availability: overrides.availability ?? 'available',
    attributes: overrides.attributes ?? {},
    capabilities: overrides.capabilities ?? [],
    lastUpdated: overrides.lastUpdated ?? '2026-09-01T00:00:00.000Z',
    resources: overrides.resources,
  };
}
