import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';

const read = (value: unknown) => (typeof value === 'string' ? value : '');

export function resolveCameraCompatibleRole(entity: NavetEntity): string | undefined {
  if ((entity.externalId.split('.')[0] ?? '') !== 'camera') return undefined;
  const text = [
    entity.externalId,
    entity.name,
    entity.room,
    entity.attributes.integration,
    entity.attributes.platform,
    entity.attributes.deviceName,
    entity.attributes.device_name,
    entity.attributes.model,
    entity.attributes.manufacturer,
  ]
    .map(read)
    .join(' ')
    .replace(/[_-]/g, ' ')
    .toLowerCase();
  if (/dreame|roborock|vacuum|robot|cleaning map|floorplan|saved map|扫地|地图/.test(text))
    return HOME_OS_ROLES.vacuumMapCamera;
  if (/doorbell|front door bell|门铃/.test(text)) return HOME_OS_ROLES.securityDoorbellCamera;
  if (
    /security|surveillance|\bipc\b|\bnvr\b|onvif|rtsp|homekit|front door|back door|entrance|garage|gate|driveway|porch|patio|garden|yard|hallway|安防|监控/.test(
      text
    )
  )
    return HOME_OS_ROLES.securityCamera;
  if (/baby monitor|pet feeder|refrigerator|fridge|oven|appliance/.test(text))
    return HOME_OS_ROLES.applianceCamera;
  if (/media|album|artwork|thumbnail|preview/.test(text)) return HOME_OS_ROLES.mediaCamera;
  return HOME_OS_ROLES.diagnosticCamera;
}
