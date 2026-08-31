import { hasCapability } from '../core/capabilities';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';

export interface HomeOsLight {
  id: string;
  sourceEntityId: string;
  sourceDomain: string;
  name: string;
  room?: string;
  state: string;
  brightness?: number;
  colorTemperature?: number;
  rgb?: [number, number, number];
  controllable: boolean;
}

export function buildHomeOsLights(entities: readonly ResolvedSemanticEntity[]): HomeOsLight[] {
  return entities
    .filter(
      (entity) =>
        !entity.ignored &&
        entity.displayMode !== 'hidden' &&
        (entity.roles.includes(HOME_OS_ROLES.lightingLight) ||
          entity.roles.includes(HOME_OS_ROLES.lightingSwitch))
    )
    .map(({ entity, displayName, room, controlPolicy }) => ({
      id: entity.canonicalId,
      sourceEntityId: entity.externalId,
      sourceDomain: entity.externalId.split('.')[0] ?? entity.type,
      name: displayName,
      room,
      state: String(entity.primaryState ?? 'unknown'),
      brightness:
        hasCapability(entity.capabilities, 'brightness') &&
        typeof entity.attributes.brightness === 'number'
          ? entity.attributes.brightness
          : undefined,
      colorTemperature:
        hasCapability(entity.capabilities, 'color_temperature') &&
        typeof entity.attributes.colorTemperature === 'number'
          ? entity.attributes.colorTemperature
          : undefined,
      rgb:
        Array.isArray(entity.attributes.rgb) && entity.attributes.rgb.length === 3
          ? (entity.attributes.rgb as [number, number, number])
          : undefined,
      controllable: controlPolicy !== 'readonly' && hasCapability(entity.capabilities, 'toggle'),
    }));
}

export const getWholeHomeLightTargets = (lights: readonly HomeOsLight[]) =>
  lights.filter(({ controllable }) => controllable).map(({ sourceEntityId }) => sourceEntityId);
