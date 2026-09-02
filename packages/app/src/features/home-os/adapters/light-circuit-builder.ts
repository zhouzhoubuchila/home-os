import { hasCapability } from '../core/capabilities';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';

export type HomeOsLightClassification =
  | 'household_lighting'
  | 'device_indicator'
  | 'appliance_light'
  | 'screen_backlight'
  | 'diagnostic';

export interface HomeOsLightCircuit {
  id: string;
  name: string;
  room?: string;
  stateSource?: { entityId: string; type: 'light' | 'switch' | 'binary_sensor' };
  actions: {
    turnOn?: string;
    turnOff?: string;
    toggle?: string;
    brightness?: string;
    colorTemperature?: string;
    color?: string;
  };
  sourceEntityIds: string[];
  stateQuality: 'reliable' | 'unknown';
  classification: HomeOsLightClassification;
}

const read = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const ACTION_WORDS =
  /\b(turn|switch|light|lamp|button|on|off|toggle|press|brightness|color|temperature)\b|开灯|关灯|灯光|灯|开关|按钮|开启|关闭/gi;

function textOf(item: ResolvedSemanticEntity) {
  const attributes = item.entity.attributes;
  return [
    item.entity.externalId,
    item.displayName,
    item.entity.name,
    item.room,
    attributes.deviceName,
    attributes.device_name,
    attributes.integration,
    attributes.platform,
    attributes.entityCategory,
    attributes.entity_category,
  ]
    .map(read)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function classificationOf(members: readonly ResolvedSemanticEntity[]): HomeOsLightClassification {
  const text = members.map(textOf).join(' ');
  if (/diagnostic|诊断/.test(text)) return 'diagnostic';
  if (/backlight|wake.?screen|screen.?light|背光|唤醒屏幕/.test(text)) return 'screen_backlight';
  if (/indicator|status led|指示灯/.test(text)) return 'device_indicator';
  if (/fridge|refrigerator|freezer|vacuum|appliance|冰箱|冰柜|扫地|家电/.test(text))
    return 'appliance_light';
  return 'household_lighting';
}

function rootName(item: ResolvedSemanticEntity) {
  const value =
    read(item.entity.attributes.deviceName ?? item.entity.attributes.device_name) ||
    item.displayName ||
    item.entity.name;
  return value
    .toLowerCase()
    .replace(ACTION_WORDS, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function groupKey(item: ResolvedSemanticEntity) {
  const attrs = item.entity.attributes;
  const deviceId = read(attrs.deviceId ?? attrs.device_id);
  if (deviceId) return `${item.entity.providerId}:device:${deviceId}`;
  const integration = read(attrs.integration ?? attrs.platform).toLowerCase();
  return `${item.entity.providerId}:semantic:${(item.room ?? '').toLowerCase()}:${rootName(item)}:${integration}`;
}

function isCandidate(item: ResolvedSemanticEntity) {
  if (item.ignored || item.displayMode === 'hidden') return false;
  const domain = item.entity.externalId.split('.')[0] ?? '';
  if (domain === 'button') return item.roles.includes(HOME_OS_ROLES.lightingSwitch);
  if (domain === 'binary_sensor') return /light|lamp|照明|灯/.test(textOf(item));
  return (
    item.roles.includes(HOME_OS_ROLES.lightingLight) ||
    item.roles.includes(HOME_OS_ROLES.lightingSwitch)
  );
}

function buttonAction(item: ResolvedSemanticEntity): 'turnOn' | 'turnOff' | 'toggle' | undefined {
  const text = textOf(item);
  if (/turn.?off|switch.?off|off button|关灯|关闭/.test(text)) return 'turnOff';
  if (/turn.?on|switch.?on|on button|开灯|开启/.test(text)) return 'turnOn';
  if (/toggle|切换/.test(text)) return 'toggle';
  return undefined;
}

function selectStateSource(members: readonly ResolvedSemanticEntity[]) {
  for (const domain of ['light', 'switch', 'binary_sensor'] as const) {
    const item = members.find((candidate) => candidate.entity.externalId.startsWith(`${domain}.`));
    if (item) return { entityId: item.entity.externalId, type: domain };
  }
  return undefined;
}

export class HomeOsLightCircuitBuilder {
  build(entities: readonly ResolvedSemanticEntity[]): HomeOsLightCircuit[] {
    const groups = new Map<string, ResolvedSemanticEntity[]>();
    for (const item of entities.filter(isCandidate)) {
      const key = groupKey(item);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].map(([id, members]) => {
      const stateSource = selectStateSource(members);
      const actions: HomeOsLightCircuit['actions'] = {};
      for (const item of members) {
        const entityId = item.entity.externalId;
        const domain = entityId.split('.')[0];
        if (domain === 'button') {
          const action = buttonAction(item);
          if (action) actions[action] = entityId;
        } else if (hasCapability(item.entity.capabilities, 'toggle')) {
          actions.toggle ??= entityId;
          actions.turnOn ??= entityId;
          actions.turnOff ??= entityId;
        }
        if (hasCapability(item.entity.capabilities, 'brightness')) actions.brightness ??= entityId;
        if (hasCapability(item.entity.capabilities, 'color_temperature'))
          actions.colorTemperature ??= entityId;
        if (Array.isArray(item.entity.attributes.rgb ?? item.entity.attributes.rgb_color))
          actions.color ??= entityId;
      }
      const representative =
        members.find((item) => item.entity.externalId === stateSource?.entityId) ?? members[0];
      return {
        id: `light-circuit:${id}`,
        name:
          read(
            representative?.entity.attributes.deviceName ??
              representative?.entity.attributes.device_name
          ) ||
          representative?.displayName ||
          'Light',
        room: representative?.room,
        stateSource,
        actions,
        sourceEntityIds: members.map((item) => item.entity.externalId),
        stateQuality: stateSource ? 'reliable' : 'unknown',
        classification: classificationOf(members),
      };
    });
  }
}
