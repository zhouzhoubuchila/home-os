import type { HomeOsFunctionalDeviceKind } from '../../core/types';

export const FUNCTIONAL_DEVICE_KINDS: HomeOsFunctionalDeviceKind[] = [
  'light',
  'switch',
  'fan',
  'outlet',
  'climate',
  'media',
  'sensor',
  'router',
  'internet',
  'pve',
  'server',
  'energy_meter',
  'gas_account',
  'air_quality',
  'person',
  'vacuum',
  'appliance',
  'other',
];

export const FUNCTIONAL_DEVICE_KIND_NAMES: Record<
  HomeOsFunctionalDeviceKind,
  { en: string; zh: string }
> = {
  light: { en: 'Light', zh: '灯光' },
  switch: { en: 'Switch', zh: '开关' },
  fan: { en: 'Fan', zh: '风扇' },
  outlet: { en: 'Outlet', zh: '插座' },
  climate: { en: 'Climate', zh: '温控' },
  media: { en: 'Media', zh: '媒体' },
  sensor: { en: 'Sensor', zh: '传感器' },
  router: { en: 'Router', zh: '路由器' },
  internet: { en: 'Internet', zh: '互联网' },
  pve: { en: 'PVE node', zh: 'PVE 节点' },
  server: { en: 'Server', zh: '服务器' },
  energy_meter: { en: 'Electricity', zh: '电力' },
  gas_account: { en: 'Gas', zh: '燃气' },
  air_quality: { en: 'Air quality', zh: '空气质量' },
  person: { en: 'Person', zh: '家庭成员' },
  vacuum: { en: 'Cleaning', zh: '清洁设备' },
  appliance: { en: 'Appliance', zh: '家电' },
  other: { en: 'Other', zh: '其他' },
};
