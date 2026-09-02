import type { NavetEntity } from '@navet/core/types';
import { HOME_OS_ROLES } from '../core/semantic-roles';

const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const ONLINE_STATES = new Set([
  'on',
  'off',
  'online',
  'offline',
  'connected',
  'disconnected',
  'true',
  'false',
]);

export function resolveRouterCompatibleRole(entity: NavetEntity, text: string): string | undefined {
  const domain = entity.externalId.split('.')[0] ?? '';
  const state = String(entity.primaryState ?? '')
    .trim()
    .toLowerCase();
  if (IPV4.test(state) || /ipv4|ip address|ip地址/.test(text)) {
    if (/\bwan\b|internet|公网|外网/.test(text)) return HOME_OS_ROLES.networkRouterWanIpv4;
    if (/\blan\b|local|内网|局域网/.test(text)) return HOME_OS_ROLES.networkRouterLanIpv4;
    return undefined;
  }
  if (/client/.test(text)) return HOME_OS_ROLES.networkRouterClients;
  if (/uptime/.test(text)) return HOME_OS_ROLES.networkRouterUptime;
  if (/cpu/.test(text)) return HOME_OS_ROLES.networkRouterCpu;
  if (/memory|ram/.test(text)) return HOME_OS_ROLES.networkRouterMemory;
  if (/upload|上传/.test(text)) return HOME_OS_ROLES.networkRouterUpload;
  if (/download|下载/.test(text)) return HOME_OS_ROLES.networkRouterDownload;
  const connectivityEvidence =
    /online|offline|connectivity|connected|availability|ping|reachable|status/.test(text);
  if (
    (domain === 'binary_sensor' || domain === 'switch') &&
    connectivityEvidence &&
    ONLINE_STATES.has(state)
  ) {
    return HOME_OS_ROLES.networkRouterOnline;
  }
  return undefined;
}
