import type { HomeAssistantNavetMappingInput } from '@navet/provider-homeassistant';

const state = (entityId: string, value: string, attributes: Record<string, unknown>) => ({
  entity_id: entityId,
  state: value,
  attributes,
  last_changed: '2026-09-18T09:00:00.000Z',
  last_updated: '2026-09-18T09:00:00.000Z',
  context: { id: `context-${entityId}`, parent_id: null, user_id: null },
});

export const REAL_HOME_ASSISTANT_FIXTURE = {
  entities: {
    'sensor.pve_cpu_usage': state('sensor.pve_cpu_usage', '24.5', {
      friendly_name: 'PVE CPU usage',
      state_class: 'measurement',
      unit_of_measurement: '%',
    }),
    'sensor.pve_cpu_temperature': state('sensor.pve_cpu_temperature', '61.2', {
      friendly_name: 'PVE CPU temperature',
      device_class: 'temperature',
      state_class: 'measurement',
      unit_of_measurement: '°C',
    }),
    'sensor.openwrt_router_clients': state('sensor.openwrt_router_clients', '20', {
      friendly_name: 'Main router clients',
      state_class: 'measurement',
    }),
    'sensor.system_monitor_disk_use': state('sensor.system_monitor_disk_use', '17.2', {
      friendly_name: 'System Monitor disk use',
      state_class: 'measurement',
      unit_of_measurement: '%',
    }),
    'sensor.home_assistant_online': state('sensor.home_assistant_online', 'online', {
      friendly_name: 'Home Assistant online status',
    }),
    'weather.home': state('weather.home', 'partlycloudy', {
      friendly_name: 'Home weather',
      temperature: 29,
      temperature_unit: '°C',
      humidity: 72,
      forecast: [{ condition: 'sunny', temperature: 30 }],
    }),
    'calendar.family': state('calendar.family', 'on', {
      friendly_name: 'Family calendar',
      message: '家庭晚餐',
      start_time: '2026-09-18 18:00:00',
      end_time: '2026-09-18 20:00:00',
    }),
    'sun.sun': state('sun.sun', 'above_horizon', {
      friendly_name: 'Sun',
      next_rising: '2026-09-19T05:30:00+09:00',
      next_setting: '2026-09-18T17:45:00+09:00',
      elevation: 38.2,
      azimuth: 186.4,
    }),
    'switch.study_light': state('switch.study_light', 'off', {
      friendly_name: 'Study light',
    }),
  },
  areas: [{ area_id: 'study', name: 'Study' }],
  deviceRegistry: [
    {
      id: 'pve-node-1',
      name_by_user: 'PVE Node 1',
      manufacturer: 'Proxmox',
      model: 'Virtual Environment',
    },
    {
      id: 'router-main',
      name_by_user: 'Main Router',
      manufacturer: 'OpenWrt',
      model: 'x86 router',
    },
    { id: 'home-assistant-host', name: 'Home Assistant host' },
    { id: 'study-light-device', area_id: 'study', name_by_user: 'Study light' },
  ],
  entityRegistry: [
    {
      entity_id: 'sensor.pve_cpu_usage',
      device_id: 'pve-node-1',
      platform: 'proxmoxve',
      unique_id: 'pve-node-1-cpu',
      entity_category: 'diagnostic',
    },
    {
      entity_id: 'sensor.pve_cpu_temperature',
      device_id: 'pve-node-1',
      platform: 'proxmoxve',
      unique_id: 'pve-node-1-temperature',
      entity_category: 'diagnostic',
    },
    {
      entity_id: 'sensor.openwrt_router_clients',
      device_id: 'router-main',
      platform: 'openwrt',
      unique_id: 'router-main-clients',
      entity_category: 'diagnostic',
    },
    {
      entity_id: 'sensor.system_monitor_disk_use',
      device_id: 'home-assistant-host',
      platform: 'systemmonitor',
      unique_id: 'system-monitor-disk-use',
      entity_category: 'diagnostic',
    },
    {
      entity_id: 'sensor.home_assistant_online',
      device_id: 'home-assistant-host',
      platform: 'systemmonitor',
      unique_id: 'home-assistant-online',
      entity_category: 'diagnostic',
    },
    { entity_id: 'weather.home', platform: 'met' },
    { entity_id: 'calendar.family', platform: 'local_calendar' },
    { entity_id: 'sun.sun', platform: 'sun' },
    {
      entity_id: 'switch.study_light',
      device_id: 'study-light-device',
      platform: 'mqtt',
      unique_id: 'study-light-relay-1',
    },
  ],
} satisfies HomeAssistantNavetMappingInput;
