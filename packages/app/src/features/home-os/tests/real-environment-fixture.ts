import { homeOsEntity } from './fixtures';

export const REAL_ENVIRONMENT_ENTITIES = [
  homeOsEntity({
    externalId: 'sensor.1_node_pve_cpu_temperature',
    name: 'PVE CPU temperature',
    room: undefined,
    primaryState: 61,
    attributes: {
      integration: 'proxmoxve',
      deviceClass: 'temperature',
      unit: '°C',
      deviceName: 'PVE Node 1',
      manufacturer: 'Proxmox',
    },
  }),
  homeOsEntity({
    externalId: 'sensor.fridge_freezer_temperature',
    name: '冰箱冷冻室温度',
    room: '厨房',
    primaryState: -24,
    attributes: {
      deviceClass: 'temperature',
      unit: '°C',
      deviceName: '厨房冰箱',
      manufacturer: 'Midea',
    },
  }),
  homeOsEntity({
    externalId: 'sensor.living_room_temperature',
    name: '客厅温度',
    room: '客厅',
    primaryState: 24,
    attributes: { deviceClass: 'temperature', unit: '°C', deviceName: '客厅环境传感器' },
  }),
  homeOsEntity({
    externalId: 'sensor.main_router_chip_temperature',
    name: '主路由芯片温度',
    room: undefined,
    primaryState: 48,
    attributes: {
      deviceClass: 'temperature',
      unit: '°C',
      deviceName: '主路由',
      integration: 'openwrt',
    },
  }),
  homeOsEntity({
    externalId: 'binary_sensor.midea_down_light',
    name: '筒灯状态',
    room: '客厅',
    attributes: { deviceClass: 'door', deviceName: '客厅筒灯', manufacturer: 'Midea' },
  }),
  homeOsEntity({
    externalId: 'sensor.router_latency',
    name: '主路由延迟',
    primaryState: 12,
    attributes: { deviceName: '主路由', integration: 'openwrt', unit: 'ms' },
  }),
  homeOsEntity({
    externalId: 'switch.wall_light',
    name: '墙灯开关',
    room: '客厅',
    primaryState: 'off',
    attributes: { deviceName: '客厅墙灯' },
    capabilities: ['toggle'],
  }),
  homeOsEntity({
    externalId: 'button.bedroom_light_toggle',
    name: '主卧灯切换',
    room: '主卧',
    attributes: { deviceName: '主卧顶灯' },
  }),
  homeOsEntity({
    externalId: 'sensor.grid_energy_today',
    name: '今日用电',
    primaryState: 8.4,
    attributes: { integration: 'state_grid', unit: 'kWh' },
  }),
] as const;
