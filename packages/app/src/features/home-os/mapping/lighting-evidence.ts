import type { NavetEntity } from '@navet/core/types';

const read = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// Device context is negative evidence; a parent appliance must never become a room light.
const APPLIANCE =
  /\b(?:washer|washing[ _-]?machine|dryer|range[ _-]?hood|hood|bath[ _-]?heater|heater|clothes[ _-]?(?:dryer|rack)|air[ _-]?conditioner|fan|refrigerator|freezer|fridge|vacuum|appliance)\b|洗衣机|干衣机|烘干机|油烟机|吸油烟机|浴霸|暖风机|晾衣机|空调|风扇|冰箱|冰柜|扫地机|热水器|家电/i;
const NON_HOUSEHOLD =
  /diagnostic|诊断|backlight|wake.?screen|screen.?light|背光|唤醒屏幕|indicator|status[ _-]?led|指示灯/i;
// A wall switch is not a light circuit merely because its device is called a "switch".
const LIGHT_CHANNEL =
  /\b(?:light|lamp|lighting|downlight|ceiling[ _-]?light|spotlight|wall[ _-]?light|led[ _-]?strip)\b|灯|照明|筒灯|吸顶灯|灯带|射灯|台灯|壁灯/i;

export function lightingChannelText(entity: NavetEntity, displayName?: string) {
  const attributes = entity.attributes;
  return [
    entity.externalId,
    displayName,
    entity.name,
    attributes.friendly_name,
    attributes.entityName,
  ]
    .map(read)
    .filter(Boolean)
    .join(' ');
}

export function lightingContextText(entity: NavetEntity, displayName?: string) {
  const attributes = entity.attributes;
  return [
    lightingChannelText(entity, displayName),
    attributes.deviceName,
    attributes.device_name,
    attributes.model,
    attributes.manufacturer,
    attributes.entityCategory,
    attributes.entity_category,
  ]
    .map(read)
    .filter(Boolean)
    .join(' ');
}

export const hasApplianceLightingEvidence = (text: string) => APPLIANCE.test(text);
export const hasNonHouseholdLightingEvidence = (text: string) => NON_HOUSEHOLD.test(text);
export const hasSpecificLightChannelEvidence = (text: string) =>
  LIGHT_CHANNEL.test(text.replace(/[_-]+/g, ' '));
