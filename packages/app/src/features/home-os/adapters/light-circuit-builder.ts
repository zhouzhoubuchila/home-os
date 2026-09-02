import { hasCapability } from '../core/capabilities';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { HomeOsFunctionalDevice, ResolvedSemanticEntity } from '../core/types';

const read = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const EXCLUDED_BUTTON =
  /doorbell|wake.?screen|screen.?wake|fridge|refrigerator|internal light|indicator|vacuum|backlight|diagnostic|status led|指示灯|唤醒屏幕|冰箱|扫地|背光/;
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
  ]
    .map(read)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
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

function isLightCandidate(item: ResolvedSemanticEntity) {
  if (item.ignored || item.displayMode === 'hidden') return false;
  const domain = item.entity.externalId.split('.')[0] ?? '';
  if (domain === 'button' && EXCLUDED_BUTTON.test(textOf(item))) return false;
  return (
    item.roles.includes(HOME_OS_ROLES.lightingLight) ||
    item.roles.includes(HOME_OS_ROLES.lightingSwitch)
  );
}

function buttonAction(item: ResolvedSemanticEntity): 'on' | 'off' | 'toggle' | undefined {
  const text = textOf(item);
  if (EXCLUDED_BUTTON.test(text)) return undefined;
  if (/turn.?off|switch.?off|off button|关灯|关闭/.test(text)) return 'off';
  if (/turn.?on|switch.?on|on button|开灯|开启/.test(text)) return 'on';
  if (/toggle|切换/.test(text)) return 'toggle';
  return undefined;
}

export class HomeOsLightCircuitBuilder {
  build(entities: readonly ResolvedSemanticEntity[]): HomeOsFunctionalDevice[] {
    const groups = new Map<string, ResolvedSemanticEntity[]>();
    for (const item of entities.filter(isLightCandidate)) {
      const key = groupKey(item);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].map(([id, members]) => {
      const stateEntity =
        members.find((item) => item.entity.externalId.startsWith('light.')) ??
        members.find((item) => hasCapability(item.entity.capabilities, 'toggle'));
      const controls: NonNullable<HomeOsFunctionalDevice['controls']> = {};
      for (const item of members) {
        const entityId = item.entity.externalId;
        const domain = entityId.split('.')[0];
        if (domain === 'button') {
          const action = buttonAction(item);
          if (action) controls[action] = entityId;
        } else if (hasCapability(item.entity.capabilities, 'toggle')) {
          controls.toggle ??= entityId;
          controls.on ??= entityId;
          controls.off ??= entityId;
        }
        if (hasCapability(item.entity.capabilities, 'brightness')) controls.brightness ??= entityId;
        if (hasCapability(item.entity.capabilities, 'color_temperature'))
          controls.colorTemperature ??= entityId;
        if (
          Array.isArray(item.entity.attributes.rgb) ||
          Array.isArray(item.entity.attributes.rgb_color)
        )
          controls.color ??= entityId;
      }
      const representative = stateEntity ?? members[0];
      return {
        id: `light-circuit:${id}`,
        kind: 'light' as const,
        name:
          read(
            representative?.entity.attributes.deviceName ??
              representative?.entity.attributes.device_name
          ) ||
          representative?.displayName ||
          'Light',
        room: representative?.room,
        stateEntityId: stateEntity?.entity.externalId,
        controls,
        metrics: {},
        sourceEntityIds: members.map((item) => item.entity.externalId),
        manual: false,
      };
    });
  }
}
