import type { DeviceWithType } from '@navet/app/types/device.types';

export type HomeOsExtensionId =
  | 'attention'
  | 'cameras'
  | 'energy-cn'
  | 'family'
  | 'homelab'
  | 'scenes';

export interface HomeOsExtension {
  id: HomeOsExtensionId;
  capabilities: readonly ('read' | 'control' | 'stream')[];
  entityMatches: (device: DeviceWithType) => boolean;
}

const text = (device: DeviceWithType) =>
  `${device.id} ${device.name} ${device.room ?? ''}`.toLowerCase();

export const HOME_OS_EXTENSIONS: readonly HomeOsExtension[] = [
  {
    id: 'energy-cn',
    capabilities: ['read'],
    entityMatches: (device) =>
      /state.?grid|electric|power|energy|towngas|gas|国家电网|电费|港华|燃气/.test(text(device)),
  },
  {
    id: 'homelab',
    capabilities: ['read'],
    entityMatches: (device) =>
      /proxmox|pve|home.?assistant|router|gateway|internet|ping|latency|loss|路由|网络/.test(
        text(device)
      ),
  },
  {
    id: 'cameras',
    capabilities: ['read', 'stream'],
    entityMatches: (device) => device.type === 'cameras',
  },
  {
    id: 'scenes',
    capabilities: ['read', 'control'],
    entityMatches: (device) => device.type === 'scenes',
  },
  {
    id: 'family',
    capabilities: ['read'],
    entityMatches: (device) => ['persons', 'calendars', 'vacuums'].includes(device.type),
  },
  {
    id: 'attention',
    capabilities: ['read'],
    entityMatches: (device) =>
      /battery|filter|brush|consumable|door|window|temperature|电池|耗材|门|窗|温度/.test(
        text(device)
      ),
  },
] as const;

export function getHomeOsExtension(id: HomeOsExtensionId) {
  return HOME_OS_EXTENSIONS.find((extension) => extension.id === id);
}
