import type { NavetEntity } from '@navet/core/types';
import type { StableEntityRef } from '../core/types';

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function stableRefForEntity(entity: NavetEntity): StableEntityRef {
  return {
    canonicalId: entity.canonicalId,
    providerId: entity.providerId,
    uniqueId: readString(entity.attributes.uniqueId ?? entity.attributes.unique_id),
    deviceId: readString(entity.attributes.deviceId ?? entity.attributes.device_id),
  };
}

export function stableRefMatchScore(reference: StableEntityRef, entity: NavetEntity): number {
  const current = stableRefForEntity(entity);
  if (reference.providerId && reference.providerId !== current.providerId) return -1;
  if (reference.canonicalId && reference.canonicalId === current.canonicalId) return 100;
  if (reference.uniqueId && reference.uniqueId === current.uniqueId) return 90;
  if (reference.deviceId && reference.deviceId === current.deviceId) return 50;
  return 0;
}
