import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { getHomeOsExtension } from './extension-registry';

const device = (id: string, type = 'sensors') =>
  ({ id, name: id, room: 'Home', size: 'small', type }) as DeviceWithType;

describe('Home OS extension registry', () => {
  it('keeps entity discovery behind stable extension contracts', () => {
    expect(
      getHomeOsExtension('energy-cn')?.entityMatches(device('sensor.state_grid_balance'))
    ).toBe(true);
    expect(getHomeOsExtension('homelab')?.entityMatches(device('sensor.pve_cpu_temperature'))).toBe(
      true
    );
    expect(
      getHomeOsExtension('cameras')?.entityMatches(device('camera.front_door', 'cameras'))
    ).toBe(true);
  });
});
