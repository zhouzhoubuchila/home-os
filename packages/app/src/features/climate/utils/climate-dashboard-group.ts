import type { DeviceWithType } from '@navet/app/types/device.types';

export type ClimateDashboardGroupKey =
  | 'climate'
  | 'fans'
  | 'temperature'
  | 'humidity'
  | 'airQuality'
  | 'pressure';

const REFRIGERATION_HINTS =
  /freezer|refrigerator|fridge|refrigeration|冰箱|冷藏|冷冻|制冷室|冷藏室|冷冻室|compressor/;

const readStringField = (device: DeviceWithType, key: string) => {
  const value = (device as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

function isRefrigerationDevice(device: DeviceWithType) {
  const metadata = [
    device.id,
    device.name,
    device.room,
    readStringField(device, 'entityType'),
    readStringField(device, 'deviceClass'),
    readStringField(device, 'serviceDomain'),
    readStringField(device, 'model'),
    readStringField(device, 'manufacturer'),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return REFRIGERATION_HINTS.test(metadata);
}

export function getClimateDashboardGroup(device: DeviceWithType): ClimateDashboardGroupKey | null {
  if (isRefrigerationDevice(device)) {
    return null;
  }

  if (device.type === 'fans') {
    return 'fans';
  }

  if (device.type === 'climate' || device.type === 'hvac') {
    return 'climate';
  }

  if (
    device.type === 'switches' &&
    (device.serviceDomain === 'humidifier' ||
      String(device.entityType ?? '').toLowerCase() === 'humidifier' ||
      String(device.entityType ?? '').toLowerCase() === 'dehumidifier')
  ) {
    return 'humidity';
  }

  if (device.type !== 'sensors') {
    return null;
  }

  switch (String(device.deviceClass ?? '').toLowerCase()) {
    case 'temperature':
      return 'temperature';
    case 'humidity':
      return 'humidity';
    case 'air_quality':
    case 'carbon_dioxide':
      return 'airQuality';
    case 'pressure':
      return 'pressure';
    default:
      return null;
  }
}
