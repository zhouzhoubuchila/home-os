import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { buildHomeOsModel } from './home-os-model';

const sensor = (id: string, name: string, value: string, unit = ''): DeviceWithType =>
  ({ id, name, value, unit, room: 'Lab', size: 'small', type: 'sensors' }) as DeviceWithType;

describe('buildHomeOsModel', () => {
  it('normalizes Chinese energy and homelab entities without raw provider payloads', () => {
    const model = buildHomeOsModel(
      new Map([
        [
          'sensor.state_grid_balance',
          sensor('sensor.state_grid_balance', '国家电网余额', '86.2', 'CNY'),
        ],
        ['sensor.towngas_total', sensor('sensor.towngas_total', '山东港华累计用气', '120', 'm³')],
        [
          'sensor.pve_cpu_temperature',
          sensor('sensor.pve_cpu_temperature', 'PVE CPU 温度', '82', '°C'),
        ],
      ])
    );

    expect(model.energy.balance).toHaveLength(1);
    expect(model.energy.gas).toHaveLength(1);
    expect(model.homelab.pve).toHaveLength(1);
    expect(model.attention[0]).toMatchObject({ category: 'homelab', severity: 'warning' });
  });
});
