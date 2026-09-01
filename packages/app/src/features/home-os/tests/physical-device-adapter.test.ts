import { describe, expect, it } from 'vitest';
import { buildPhysicalDevices } from '../adapters/physical-device-adapter';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('physical device adapter', () => {
  it('aggregates multiple metrics into one configured physical device and excludes ignored entities', () => {
    const mappings: ManualEntityMapping[] = [
      ['sensor.pve_cpu', HOME_OS_ROLES.homelabPveCpu],
      ['sensor.pve_temp', HOME_OS_ROLES.homelabPveTemperature],
    ].map(([entityId, role]) => ({
      schemaVersion: 2,
      entityId,
      semanticRoles: [role],
      physicalDeviceId: 'pve-main',
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    }));
    mappings.push({
      schemaVersion: 2,
      entityId: 'sensor.pve_debug',
      ignored: true,
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });
    const devices = buildPhysicalDevices(
      resolveSemanticEntities(
        [
          homeOsEntity({ externalId: 'sensor.pve_cpu', primaryState: 18 }),
          homeOsEntity({ externalId: 'sensor.pve_temp', primaryState: 52 }),
          homeOsEntity({ externalId: 'sensor.pve_debug', primaryState: 1 }),
        ],
        mappings
      ),
      [{ id: 'pve-main', name: 'PVE', category: 'homelab', entityIds: [] }]
    );
    expect(devices).toHaveLength(1);
    expect(devices[0]?.entityIds).toEqual(['sensor.pve_cpu', 'sensor.pve_temp']);
    expect(Object.keys(devices[0]?.semanticMetrics ?? {})).toHaveLength(2);
  });

  it('does not let a stale static version claim that PVE data is realtime', () => {
    const mappings: ManualEntityMapping[] = [
      ['sensor.pve_version', HOME_OS_ROLES.homelabPveVersion],
      ['sensor.pve_cpu', HOME_OS_ROLES.homelabPveCpu],
    ].map(([entityId, role]) => ({
      schemaVersion: 2,
      entityId,
      semanticRoles: [role],
      physicalDeviceId: 'pve-main',
      source: 'manual',
      updatedAt: '2026-09-01T00:00:00.000Z',
    }));
    const [device] = buildPhysicalDevices(
      resolveSemanticEntities(
        [
          homeOsEntity({
            externalId: 'sensor.pve_version',
            primaryState: '9.2.2',
            lastUpdated: '2026-09-01T11:59:00.000Z',
          }),
          homeOsEntity({
            externalId: 'sensor.pve_cpu',
            primaryState: 18,
            lastUpdated: '2026-09-01T00:00:00.000Z',
          }),
        ],
        mappings
      ),
      [],
      { now: Date.parse('2026-09-01T12:00:00.000Z') }
    );
    expect(device?.state).toBe('online');
    expect(device?.freshness).toBe('stale');
    expect(device?.health).toBe('warning');
  });
});
