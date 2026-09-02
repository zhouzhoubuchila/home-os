import { hasCapability } from '../core/capabilities';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';
import { resolveFunctionalDevices } from './functional-device-adapter';
import { HomeOsLightCircuitBuilder } from './light-circuit-builder';

export interface HomeOsLight {
  id: string;
  sourceEntityId: string;
  providerId: ResolvedSemanticEntity['entity']['providerId'];
  sourceDomain: string;
  name: string;
  room?: string;
  state: string;
  brightness?: number;
  colorTemperature?: number;
  rgb?: [number, number, number];
  controllable: boolean;
  sourceEntityIds: string[];
  controls: NonNullable<HomeOsFunctionalDevice['controls']>;
  manual: boolean;
}

export function buildHomeOsLights(
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[] = []
): HomeOsLight[] {
  const manualCircuits = resolveFunctionalDevices(
    functionalDevices.filter((device) => device.kind === 'light'),
    entities
  );
  const manualSourceIds = new Set(manualCircuits.flatMap((circuit) => circuit.sourceEntityIds));
  const automaticConfigs = new HomeOsLightCircuitBuilder().build(
    entities.filter((item) => !manualSourceIds.has(item.entity.externalId))
  );
  const circuits = [...manualCircuits, ...resolveFunctionalDevices(automaticConfigs, entities)];
  const circuitSourceIds = new Set(circuits.flatMap((circuit) => circuit.sourceEntityIds));
  const entityLights = entities
    .filter((entity) => {
      const text =
        `${entity.entity.externalId} ${entity.displayName} ${entity.entity.name}`.toLowerCase();
      const excludedButton =
        entity.entity.externalId.startsWith('button.') &&
        /doorbell|wake.?screen|screen.?wake|fridge|refrigerator|internal light|indicator|vacuum|backlight|diagnostic|status led|指示灯|唤醒屏幕|冰箱|扫地|背光/.test(
          text
        );
      return (
        !excludedButton &&
        !entity.ignored &&
        entity.displayMode !== 'hidden' &&
        !circuitSourceIds.has(entity.entity.externalId) &&
        (entity.roles.includes(HOME_OS_ROLES.lightingLight) ||
          entity.roles.includes(HOME_OS_ROLES.lightingSwitch))
      );
    })
    .map(({ entity, displayName, room, controlPolicy, source }) => ({
      id: entity.canonicalId,
      sourceEntityId: entity.externalId,
      providerId: entity.providerId,
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
      controllable:
        controlPolicy !== 'readonly' &&
        (hasCapability(entity.capabilities, 'toggle') || entity.externalId.startsWith('button.')),
      sourceEntityIds: [entity.externalId],
      controls: { toggle: entity.externalId },
      manual: source === 'manual',
    }));
  const circuitLights = circuits.map((circuit): HomeOsLight => {
    const stateEntity = circuit.entities.find(
      (item) => item.entity.externalId === circuit.stateEntityId
    );
    const fallbackControlId =
      circuit.controls?.toggle ?? circuit.controls?.on ?? circuit.controls?.off;
    const controlEntity = circuit.entities.find(
      (item) => item.entity.externalId === fallbackControlId
    );
    return {
      id: circuit.id,
      sourceEntityId:
        fallbackControlId ?? circuit.stateEntityId ?? circuit.sourceEntityIds[0] ?? '',
      providerId:
        controlEntity?.entity.providerId ?? stateEntity?.entity.providerId ?? 'home_assistant',
      sourceDomain: (fallbackControlId ?? circuit.stateEntityId ?? '').split('.')[0] ?? 'light',
      name: circuit.name,
      room: circuit.room ?? stateEntity?.room,
      state: String(
        stateEntity?.entity.primaryState ?? controlEntity?.entity.primaryState ?? 'unknown'
      ),
      brightness:
        typeof stateEntity?.entity.attributes.brightness === 'number'
          ? stateEntity.entity.attributes.brightness
          : undefined,
      colorTemperature:
        typeof stateEntity?.entity.attributes.colorTemperature === 'number'
          ? stateEntity.entity.attributes.colorTemperature
          : undefined,
      controllable: Boolean(fallbackControlId && Object.keys(circuit.controls ?? {}).length),
      sourceEntityIds: circuit.sourceEntityIds,
      controls: circuit.controls ?? {},
      manual: circuit.manual === true,
    };
  });
  return [...entityLights, ...circuitLights];
}

export const getWholeHomeLightTargets = (lights: readonly HomeOsLight[]) =>
  lights
    .filter(({ controllable, sourceDomain }) => controllable && sourceDomain !== 'button')
    .map(({ controls, sourceEntityId }) => controls.off ?? controls.toggle ?? sourceEntityId);

export interface HomeOsLightAction {
  entityId: string;
  command: 'turn_off' | 'trigger';
  providerId: HomeOsLight['providerId'];
}

export const getWholeHomeLightActions = (lights: readonly HomeOsLight[]): HomeOsLightAction[] =>
  lights.flatMap((light) => {
    const target = light.controls.off ?? light.controls.toggle;
    if (!light.controllable || !target) return [];
    return [
      {
        entityId: target,
        command: target.startsWith('button.') ? 'trigger' : 'turn_off',
        providerId: light.providerId,
      },
    ];
  });
