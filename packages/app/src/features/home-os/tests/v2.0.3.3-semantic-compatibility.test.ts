import type { CameraDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { resolveCameraMediaStatus } from '../../security/utils/camera-media-status';
import {
  buildSecurityCameraDashboardModel,
  classifyCameraSemanticRole,
} from '../../security/utils/security-camera-dashboard-model';
import { HomeOsLightCircuitBuilder } from '../adapters/light-circuit-builder';
import { buildHomeOsLights } from '../adapters/lighting-adapter';
import { HomeOsHassFacade } from '../astronomy/home-os-hass-facade';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import { formatHomeOsValueWithUnit, formatHomeOsWeatherCondition } from '../i18n/display-state';
import { classifyEntity } from '../mapping/auto-classifier';
import { getMetricFreshnessClass } from '../mapping/metric-resolution';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

const pve = (name: string, state: string | number, unit?: string) =>
  homeOsEntity({
    externalId: `sensor.pve_${name.toLowerCase().replaceAll(' ', '_')}`,
    name,
    primaryState: state,
    attributes: { integration: 'proxmoxve', unit_of_measurement: unit, deviceName: 'PVE Node' },
  });

const camera = (
  overrides: Partial<CameraDevice> & Pick<CameraDevice, 'id' | 'name'>
): CameraDevice => ({
  room: overrides.room ?? 'Home',
  size: 'medium',
  state: 'idle',
  providerId: 'home_assistant',
  isStillImageOnly: true,
  isStreamCapable: false,
  securityKind: 'camera',
  securitySeverity: 'normal',
  ...overrides,
  id: overrides.id,
  name: overrides.name,
});

describe('Home OS V2.0.3.3 semantic compatibility', () => {
  it.each([
    [pve('CPU temperature', 61, '°C'), HOME_OS_ROLES.homelabPveTemperature],
    [pve('DIMM 1', 4, 'GB'), HOME_OS_ROLES.diagnosticMemoryModule],
    [pve('Core voltage', 8.612, 'V'), HOME_OS_ROLES.diagnosticHardwareVoltage],
    [pve('Load', 1.32), HOME_OS_ROLES.homelabPveLoad],
  ])('classifies compatible PVE metrics without an online fallback', (entity, expected) => {
    expect(classifyEntity(entity)[0]?.role).toBe(expected);
  });

  it('leaves unknown numeric PVE telemetry unmapped instead of online', () => {
    expect(classifyEntity(pve('Mystery count', 12))).toEqual([]);
  });

  it('maps WAN IPv4 as static data and never as router online', () => {
    const entity = homeOsEntity({
      externalId: 'sensor.openwrt_wan_ipv4',
      name: 'OpenWrt WAN IPv4',
      primaryState: '203.0.113.8',
      attributes: { integration: 'openwrt' },
    });
    expect(classifyEntity(entity)[0]?.role).toBe(HOME_OS_ROLES.networkRouterWanIpv4);
    expect(getMetricFreshnessClass(HOME_OS_ROLES.networkRouterWanIpv4)).toBe('static');
  });

  it('aggregates a switch and action button from one lamp into one functional circuit', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'switch.desk_lamp',
        name: 'Desk lamp',
        capabilities: ['toggle'],
        attributes: { device_id: 'lamp-1' },
      }),
      homeOsEntity({
        externalId: 'button.desk_lamp_off',
        name: 'Desk lamp off',
        attributes: { device_id: 'lamp-1' },
      }),
    ]);
    expect(new HomeOsLightCircuitBuilder().build(entities)).toHaveLength(1);
    const lights = buildHomeOsLights(entities);
    expect(lights).toHaveLength(1);
    expect(lights[0]?.sourceEntityIds).toEqual(['switch.desk_lamp', 'button.desk_lamp_off']);
  });

  it('rejects a doorbell wake-screen button from Lighting', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'button.doorbell_light_wake_screen',
        name: 'Doorbell light wake screen',
        attributes: { device_id: 'doorbell-1' },
      }),
    ]);
    expect(buildHomeOsLights(entities)).toEqual([]);
  });

  it('excludes vacuum maps from Security and deduplicates one media source', () => {
    const map = camera({ id: 'camera.dreame_cleaning_map', name: 'Dreame Cleaning Map' });
    expect(classifyCameraSemanticRole(map)).toBe('vacuum.map_camera');
    const model = buildSecurityCameraDashboardModel({
      cameras: [
        map,
        camera({
          id: 'camera.front_door',
          name: 'Front Door',
          entityPicture: '/api/camera_proxy/camera.front?_t=1',
        }),
        camera({
          id: 'camera.front_door_2',
          name: 'Front Door',
          entityPicture: '/api/camera_proxy/camera.front?_t=2',
        }),
      ],
      locks: [],
      sensors: [],
    });
    expect(model.groups.cameras).toHaveLength(1);
  });

  it('uses the thin Home OS facade and formats final display values', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'sun.sun',
        primaryState: 'above_horizon',
        attributes: { elevation: 12 },
      }),
    ]);
    expect(new HomeOsHassFacade(entities).getState('sun.sun')?.state).toBe('above_horizon');
    expect(formatHomeOsValueWithUnit(23, 'celsius')).toBe('23°C');
    expect(formatHomeOsValueWithUnit(12.6, 'km/h')).toBe('12.6 km/h');
    expect(formatHomeOsValueWithUnit(1016.6, 'hPa')).toBe('1016.6 hPa');
    expect(formatHomeOsWeatherCondition('clear-night', 'zh')).toBe('晴夜');
  });

  it('distinguishes camera media failure modes without routing camera entities through Media Browser', () => {
    expect(
      resolveCameraMediaStatus({
        available: true,
        streamCapable: false,
        snapshotUrl: '/api/camera_proxy/camera.front',
      })
    ).toBe('snapshot_only');
    expect(
      resolveCameraMediaStatus({
        available: true,
        streamCapable: true,
        error: { code: 'start_stream_failed', message: 'does not support play stream service' },
      })
    ).toBe('stream_unsupported');
    expect(
      resolveCameraMediaStatus({ available: true, streamCapable: true, error: { status: 401 } })
    ).toBe('authentication_required');
    expect(
      resolveCameraMediaStatus({
        available: true,
        streamCapable: true,
        error: new Error('Media Browser unavailable'),
      })
    ).toBe('media_browser_unavailable');
    expect(resolveCameraMediaStatus({ available: false, streamCapable: false })).toBe(
      'unavailable'
    );
  });
});
