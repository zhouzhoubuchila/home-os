import { getHomeOsMotionTier } from '@navet/app/components/shared/theme/lunar-series-surface';
import { describe, expect, it } from 'vitest';
import { HOME_OS_ROLES } from '../core/semantic-roles';
import type { ManualEntityMapping } from '../core/types';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { buildHomeOsStatusRail } from '../projection/home-os-status-rail';
import { homeOsEntity } from './fixtures';

const mapping = (entityId: string, role: string): ManualEntityMapping => ({
  schemaVersion: 2,
  entityId,
  semanticRoles: [role],
  source: 'manual',
  updatedAt: '2026-09-27T00:00:00.000Z',
});

describe('Home OS status rail', () => {
  it('omits metrics without real sources', () => {
    expect(buildHomeOsStatusRail([], [], [], 'zh')).toEqual([]);
  });

  it('does not present stale HA states as live while disconnected', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'person.alex', name: 'Alex', primaryState: 'home' }),
    ]);
    expect(buildHomeOsStatusRail(entities, [], [], 'zh', false)).toEqual([]);
  });

  it('reuses real presence, household lighting and Internet semantic state', () => {
    const entities = resolveSemanticEntities(
      [
        homeOsEntity({ externalId: 'person.alex', name: 'Alex', primaryState: 'home' }),
        homeOsEntity({
          externalId: 'light.study',
          name: '书房灯',
          primaryState: 'on',
          capabilities: ['toggle'],
        }),
        homeOsEntity({
          externalId: 'sensor.internet_ping',
          name: 'Internet ping',
          primaryState: 12,
          attributes: { integration: 'ping', unit: 'ms' },
        }),
      ],
      [mapping('sensor.internet_ping', HOME_OS_ROLES.networkInternetLatency)]
    );
    const rail = buildHomeOsStatusRail(entities, [], [], 'zh', true);
    expect(rail.find((item) => item.kind === 'household')?.value).toBe('1 / 1 在家');
    expect(rail.find((item) => item.kind === 'lighting')?.value).toBe('1 盏开启');
    expect(rail.find((item) => item.kind === 'internet')?.value).toBe('在线');
    expect(rail).not.toContainEqual(expect.objectContaining({ kind: 'battery' }));
    expect(rail).toHaveLength(4);
  });

  it('does not turn missing Internet or battery data into normal readings', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({ externalId: 'person.alex', name: 'Alex', primaryState: 'not_home' }),
    ]);
    const rail = buildHomeOsStatusRail(entities, [], [], 'en', true);
    expect(rail.some((item) => item.kind === 'internet')).toBe(false);
    expect(rail.some((item) => item.kind === 'battery')).toBe(false);
  });

  it('keeps infrastructure motion quiet without disabling Hero motion', () => {
    expect(getHomeOsMotionTier('lunar')).toBe('A');
    expect(getHomeOsMotionTier('weather')).toBe('A');
    expect(getHomeOsMotionTier('lighting')).toBe('B');
    expect(getHomeOsMotionTier('media-stack')).toBe('B');
    expect(getHomeOsMotionTier('internet')).toBe('C');
    expect(getHomeOsMotionTier('pve')).toBe('C');
    expect(getHomeOsMotionTier('unrelated-navet-card')).toBeUndefined();
  });
});
