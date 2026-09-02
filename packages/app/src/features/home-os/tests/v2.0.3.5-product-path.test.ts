import type { DeviceCollection, MediaDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ResolvedSemanticEntity } from '../core/types';
import {
  buildHomeOsProductProjection,
  projectPhysicalMediaDevices,
  projectSecurityDeviceCollection,
} from '../projection/product-path-projection';
import { homeOsEntity } from './fixtures';

function resolved(
  externalId: string,
  roles: ResolvedSemanticEntity['roles'],
  overrides: Parameters<typeof homeOsEntity>[0] = {}
): ResolvedSemanticEntity {
  const entity = homeOsEntity({ externalId, ...overrides });
  return {
    entity,
    candidates: [],
    roles,
    confidence: 1,
    reasons: ['test fixture'],
    source: 'manual',
    displayName: entity.name,
    room: entity.room,
    displayMode: 'primary',
    controlPolicy: 'direct',
    ignored: false,
    needsReview: false,
    reviewDisposition: 'mapped',
  };
}

function media(overrides: Partial<MediaDevice> & Pick<MediaDevice, 'id'>): MediaDevice & {
  type: 'media';
} {
  const { id, ...rest } = overrides;
  return {
    id,
    name: '我的电视5',
    room: 'Living room',
    size: 'medium',
    title: '',
    artist: '',
    state: 'idle',
    volume: 0.25,
    isMuted: false,
    type: 'media',
    ...rest,
  };
}

function emptyDevices(): DeviceCollection {
  return {
    lights: [],
    fans: [],
    hvac: [],
    climate: [],
    media: [],
    weather: [],
    switches: [],
    helpers: [],
    covers: [],
    locks: [],
    scenes: [],
    persons: [],
    sensors: [],
    vacuums: [],
    calendars: [],
    cameras: [],
    'grouped-sensors': [],
  };
}

describe('Home OS V2.0.3.5 product-path projection', () => {
  it('projects a switch-only household light with separate identity and command targets', () => {
    const entity = resolved('switch.hall_ceiling', [HOME_OS_ROLES.lightingSwitch], {
      name: 'Hall ceiling light',
      room: 'Hall',
      primaryState: 'unavailable',
      availability: 'unavailable',
      capabilities: ['toggle'],
      attributes: { deviceId: 'hall-relay', deviceName: 'Hall ceiling light' },
    });

    const [light] = buildHomeOsProductProjection({ entities: [entity] }).lighting;

    expect(light).toMatchObject({
      room: 'Hall',
      state: 'unavailable',
      stateEntityId: 'home_assistant:switch.hall_ceiling',
      primaryCommandTarget: 'home_assistant:switch.hall_ceiling',
      supportsToggle: true,
    });
    expect(light?.id).not.toBe(light?.primaryCommandTarget);
    expect(light?.projection).toMatchObject({
      sourceEntityIds: ['home_assistant:switch.hall_ceiling'],
      commandTargets: {
        toggle: ['home_assistant:switch.hall_ceiling'],
      },
    });
  });

  it('removes refrigerator and vacuum-map camera entities before the real security collection', () => {
    const refrigerator = resolved('binary_sensor.fridge_door', [HOME_OS_ROLES.applianceDoor]);
    const vacuumMap = resolved('camera.vacuum_map', [HOME_OS_ROLES.vacuumMapCamera]);
    const entrance = resolved('camera.entrance', [HOME_OS_ROLES.securityCamera]);
    const projection = buildHomeOsProductProjection({
      entities: [refrigerator, vacuumMap, entrance],
    });
    const devices = emptyDevices();
    devices.sensors.push({
      id: refrigerator.entity.canonicalId,
      canonicalId: refrigerator.entity.canonicalId,
      name: 'Fridge door',
      room: 'Kitchen',
      size: 'small',
      value: 'Open',
      unit: '',
      status: 'active',
    });
    devices.cameras.push(
      {
        id: vacuumMap.entity.canonicalId,
        canonicalId: vacuumMap.entity.canonicalId,
        name: 'Vacuum map',
        room: 'Living room',
        size: 'medium',
        state: 'idle',
      },
      {
        id: entrance.entity.canonicalId,
        canonicalId: entrance.entity.canonicalId,
        name: 'Entrance',
        room: 'Entrance',
        size: 'medium',
        state: 'streaming',
      }
    );

    const projected = projectSecurityDeviceCollection(devices, projection);

    expect(projected.sensors).toHaveLength(0);
    expect(projected.cameras.map((item) => item.name)).toEqual(['Entrance']);
    expect(projected.cameras[0]?.projection?.semanticSource).toBe('manual');
  });

  it('deduplicates media by provider plus physical-device id, never by display name', () => {
    const projected = projectPhysicalMediaDevices([
      media({
        id: 'home_assistant:media_player.tv_receiver',
        canonicalId: 'home_assistant:media_player.tv_receiver',
        providerId: 'home_assistant',
        underlyingDeviceId: 'tv-5',
        state: 'playing',
      }),
      media({
        id: 'home_assistant:media_player.tv_cast',
        canonicalId: 'home_assistant:media_player.tv_cast',
        providerId: 'home_assistant',
        underlyingDeviceId: 'tv-5',
      }),
      media({
        id: 'home_assistant:media_player.bedroom_tv',
        canonicalId: 'home_assistant:media_player.bedroom_tv',
        providerId: 'home_assistant',
        underlyingDeviceId: 'bedroom-tv',
      }),
    ]);

    expect(projected).toHaveLength(2);
    expect(projected.filter((item) => item.name === '我的电视5')).toHaveLength(2);
    const livingRoom = projected.find((item) => item.underlyingDeviceId === 'tv-5');
    expect(livingRoom?.projection?.sourceEntityIds).toHaveLength(2);
    expect(livingRoom?.id).toBe('home_assistant:media_player.tv_receiver');
  });

  it('projects PVE metrics into one physical device and preserves astronomy domains', () => {
    const pveOnline = resolved('binary_sensor.pve_online', [HOME_OS_ROLES.homelabPveOnline], {
      primaryState: 'on',
      attributes: { deviceName: 'pve-node', integration: 'proxmox' },
    });
    const pveCpu = resolved('sensor.pve_cpu', [HOME_OS_ROLES.homelabPveCpu], {
      primaryState: 18,
      attributes: { deviceName: 'pve-node', integration: 'proxmox', unit: '%' },
    });
    const sun = resolved('sun.sun', [], { primaryState: 'above_horizon' });
    const moon = resolved('moon.home', [], { primaryState: 'waxing_crescent' });

    const projection = buildHomeOsProductProjection({ entities: [pveOnline, pveCpu, sun, moon] });

    expect(projection.pveDevices).toHaveLength(1);
    expect(projection.pveDevices[0]).toMatchObject({ name: 'pve-node', state: 'online' });
    expect(projection.pveDevices[0]?.semanticMetrics).toHaveProperty(HOME_OS_ROLES.homelabPveCpu);
    expect(projection.astronomyEntities.map((item) => item.entity.externalId)).toEqual([
      'sun.sun',
      'moon.home',
    ]);
  });
});
