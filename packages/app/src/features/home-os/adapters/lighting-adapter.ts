import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';
import {
  hasApplianceLightingEvidence,
  hasNonHouseholdLightingEvidence,
  hasSpecificLightChannelEvidence,
  lightingContextText,
} from '../mapping/lighting-evidence';
import { resolveFunctionalDevices } from './functional-device-adapter';
import {
  type HomeOsLightCircuit,
  HomeOsLightCircuitBuilder,
  type HomeOsLightClassification,
} from './light-circuit-builder';

export interface HomeOsLight extends HomeOsLightCircuit {
  sourceEntityId: string;
  providerId: ResolvedSemanticEntity['entity']['providerId'];
  sourceDomain: string;
  state: string;
  brightness?: number;
  colorTemperature?: number;
  rgb?: [number, number, number];
  controllable: boolean;
  controls: NonNullable<HomeOsFunctionalDevice['controls']>;
  manual: boolean;
}

const stateDomain = (entityId?: string) => entityId?.split('.')[0] ?? '';

function manualClassification(
  name: string,
  sourceEntityIds: readonly string[],
  entityById: ReadonlyMap<string, ResolvedSemanticEntity>
): HomeOsLightClassification {
  const sources = sourceEntityIds.map((id) => entityById.get(id)).filter((item) => item != null);
  const text = [
    name,
    ...sources.map((item) => lightingContextText(item.entity, item.displayName)),
  ].join(' ');
  if (/diagnostic|诊断/.test(text)) return 'diagnostic';
  if (/backlight|wake.?screen|screen.?light|背光|唤醒屏幕/.test(text)) return 'screen_backlight';
  if (/indicator|status led|指示灯/.test(text)) return 'device_indicator';
  if (hasApplianceLightingEvidence(text)) return 'appliance_light';
  if (
    !sourceEntityIds.some((id) => id.startsWith('light.')) &&
    !hasSpecificLightChannelEvidence([name, ...sourceEntityIds].join(' '))
  )
    return 'diagnostic';
  return 'household_lighting';
}

function confirmedWholeHomeLight(light: HomeOsLight) {
  const text = [light.name, ...light.sourceEntityIds, ...Object.values(light.actions)].join(' ');
  return (
    light.controllable &&
    light.classification === 'household_lighting' &&
    !hasApplianceLightingEvidence(text) &&
    !hasNonHouseholdLightingEvidence(text) &&
    (light.sourceEntityIds.some((id) => id.startsWith('light.')) ||
      hasSpecificLightChannelEvidence(text))
  );
}

function automaticCircuits(
  entities: readonly ResolvedSemanticEntity[],
  excluded: ReadonlySet<string>
) {
  return new HomeOsLightCircuitBuilder()
    .build(entities.filter((item) => !excluded.has(item.entity.externalId)))
    .filter((circuit) => circuit.classification === 'household_lighting');
}

export function buildHomeOsLights(
  entities: readonly ResolvedSemanticEntity[],
  functionalDevices: readonly HomeOsFunctionalDevice[] = []
): HomeOsLight[] {
  const entityById = new Map(entities.map((item) => [item.entity.externalId, item]));
  const manualResolved = resolveFunctionalDevices(
    functionalDevices.filter((device) => device.kind === 'light'),
    entities
  );
  const manualSourceIds = new Set(manualResolved.flatMap((circuit) => circuit.sourceEntityIds));
  const circuits: Array<HomeOsLightCircuit & { manual: boolean }> = [
    ...manualResolved.map((circuit) => {
      const domain = stateDomain(circuit.stateEntityId);
      const stateSource = ['light', 'switch', 'binary_sensor'].includes(domain)
        ? {
            entityId: circuit.stateEntityId as string,
            type: domain as 'light' | 'switch' | 'binary_sensor',
          }
        : undefined;
      return {
        id: circuit.id,
        name: circuit.name,
        room: circuit.room,
        stateSource,
        actions: {
          turnOn: circuit.controls?.on,
          turnOff: circuit.controls?.off,
          toggle: circuit.controls?.toggle,
          brightness: circuit.controls?.brightness,
          colorTemperature: circuit.controls?.colorTemperature,
          color: circuit.controls?.color,
        },
        sourceEntityIds: circuit.sourceEntityIds,
        stateQuality: stateSource ? ('reliable' as const) : ('unknown' as const),
        classification: manualClassification(circuit.name, circuit.sourceEntityIds, entityById),
        manual: true,
      };
    }),
    ...automaticCircuits(entities, manualSourceIds).map((circuit) => ({
      ...circuit,
      manual: false,
    })),
  ];

  return circuits
    .filter((circuit) => circuit.classification === 'household_lighting')
    .map((circuit) => {
      const stateEntity = circuit.stateSource
        ? entityById.get(circuit.stateSource.entityId)
        : undefined;
      const primaryAction =
        circuit.actions.toggle ?? circuit.actions.turnOn ?? circuit.actions.turnOff;
      const controlEntity = primaryAction ? entityById.get(primaryAction) : undefined;
      const providerId =
        controlEntity?.entity.providerId ?? stateEntity?.entity.providerId ?? 'home_assistant';
      const controls = {
        on: circuit.actions.turnOn,
        off: circuit.actions.turnOff,
        toggle: circuit.actions.toggle,
        brightness: circuit.actions.brightness,
        colorTemperature: circuit.actions.colorTemperature,
        color: circuit.actions.color,
      };
      const rgb = stateEntity?.entity.attributes.rgb ?? stateEntity?.entity.attributes.rgb_color;
      return {
        ...circuit,
        sourceEntityId:
          primaryAction ?? circuit.stateSource?.entityId ?? circuit.sourceEntityIds[0] ?? '',
        providerId,
        sourceDomain: stateDomain(primaryAction ?? circuit.stateSource?.entityId),
        state:
          circuit.stateQuality === 'reliable'
            ? String(stateEntity?.entity.primaryState ?? 'unknown')
            : 'unknown',
        brightness:
          typeof stateEntity?.entity.attributes.brightness === 'number'
            ? stateEntity.entity.attributes.brightness
            : undefined,
        colorTemperature:
          typeof stateEntity?.entity.attributes.colorTemperature === 'number'
            ? stateEntity.entity.attributes.colorTemperature
            : undefined,
        rgb: Array.isArray(rgb) && rgb.length === 3 ? (rgb as [number, number, number]) : undefined,
        controllable: Boolean(primaryAction),
        controls,
      };
    });
}

export const getWholeHomeLightTargets = (lights: readonly HomeOsLight[]) =>
  lights.filter(confirmedWholeHomeLight).flatMap(({ actions }) => {
    const target =
      actions.turnOff ??
      (actions.toggle && !actions.toggle.startsWith('button.') ? actions.toggle : undefined);
    return target ? [target] : [];
  });

export interface HomeOsLightAction {
  entityId: string;
  command: 'turn_off' | 'trigger';
  providerId: HomeOsLight['providerId'];
}

export const getWholeHomeLightActions = (lights: readonly HomeOsLight[]): HomeOsLightAction[] =>
  lights.flatMap((light) => {
    const target =
      light.actions.turnOff ??
      (light.actions.toggle && !light.actions.toggle.startsWith('button.')
        ? light.actions.toggle
        : undefined);
    if (!confirmedWholeHomeLight(light) || !target) return [];
    return [
      {
        entityId: target,
        command: target.startsWith('button.') ? 'trigger' : 'turn_off',
        providerId: light.providerId,
      },
    ];
  });
