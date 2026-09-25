import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import type { HomeDashboardLayoutState } from '../hooks/use-home-dashboard-layout';
import type { CustomCard } from '../stores/custom-cards-store';
import { buildDashboardPackLayout, buildHomeOsRecommendedLayout } from './dashboard-packs';

function device(overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>) {
  return {
    name: overrides.id,
    room: 'Kitchen',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

describe('dashboard packs', () => {
  it('groups existing Home OS cards into paired rows and keeps extra cards', () => {
    const kinds = [
      'internet',
      'lunar',
      'alerts',
      'weather',
      'router',
      'device-health',
      'lighting',
      'household',
      'pve',
      'home-assistant',
      'gas',
      'electricity',
    ];
    const cards = kinds.map((kind) => ({
      id: kind,
      type: 'home-os',
      size: 'medium',
      room: 'All',
      data: { kind },
      createdAt: 0,
    })) as CustomCard[];
    cards.push({ id: 'battery', type: 'battery', size: 'large', room: 'All', createdAt: 0 });
    const original: HomeDashboardLayoutState = {
      mode: 'flow',
      showHero: false,
      cardIds: [
        'internet',
        'battery',
        'lunar',
        'extra',
        ...kinds.filter((kind) => kind !== 'internet' && kind !== 'lunar'),
      ],
      sections: [],
      cardSectionAssignments: {},
    };
    const { layout, cardSizes } = buildHomeOsRecommendedLayout(original, cards);
    expect(original.mode).toBe('flow');
    expect(original.cardIds[0]).toBe('internet');
    expect(layout.mode).toBe('sectioned');
    expect(layout.cardIds).toEqual([
      'lunar',
      'weather',
      'household',
      'lighting',
      'device-health',
      'alerts',
      'pve',
      'home-assistant',
      'router',
      'internet',
      'electricity',
      'gas',
      'battery',
      'extra',
    ]);
    expect(layout.sections.map((section) => section.title)).toEqual([
      'Daily',
      'Home',
      'Infrastructure',
      'Energy & Utilities',
    ]);
    expect(layout.sections.every((section) => section.w === 12)).toBe(true);
    expect(cardSizes.lunar).toBe('extra-large');
    expect(cardSizes.battery).toBe('medium');
    expect(cardSizes.extra).toBeUndefined();
    expect(new Set(layout.cardIds).size).toBe(layout.cardIds.length);
  });

  it('does not add unselected cards to the recommended layout', () => {
    const current: HomeDashboardLayoutState = {
      mode: 'flow',
      showHero: false,
      cardIds: ['weather'],
      sections: [],
      cardSectionAssignments: {},
    };
    const cards = [
      {
        id: 'weather',
        type: 'home-os',
        size: 'medium',
        room: 'All',
        data: { kind: 'weather' },
        createdAt: 0,
      },
      {
        id: 'lunar',
        type: 'home-os',
        size: 'medium',
        room: 'All',
        data: { kind: 'lunar' },
        createdAt: 0,
      },
    ] as CustomCard[];
    expect(buildHomeOsRecommendedLayout(current, cards).layout.cardIds).toEqual(['weather']);
  });

  it('builds a command center around attention, comfort, household, and action cards', () => {
    const layout = buildDashboardPackLayout('command-center', [
      device({
        id: 'lock.front_door',
        name: 'Front Door',
        type: 'locks',
        state: false,
        securitySeverity: 'warning',
      }),
      device({
        id: 'weather.home',
        name: 'Home Weather',
        type: 'weather',
      }),
      device({
        id: 'calendar.family',
        name: 'Family Calendar',
        type: 'calendars',
      }),
      device({
        id: 'scene.movie',
        name: 'Movie',
        type: 'scenes',
      }),
    ]);

    expect(layout.mode).toBe('sectioned');
    expect(layout.showHero).toBe(false);
    expect(layout.sections.map((section) => section.title)).toEqual([
      'Needs Attention',
      'Comfort',
      'Household',
      'Quick Actions',
    ]);
    expect(layout.cardIds).toEqual([
      'lock.front_door',
      'weather.home',
      'calendar.family',
      'scene.movie',
    ]);
    expect(layout.cardSectionAssignments['lock.front_door']).toBe(
      'dashboard-pack-command-center-attention'
    );
  });

  it('deduplicates cards that match multiple energy sections', () => {
    const layout = buildDashboardPackLayout('energy-wall', [
      device({
        id: 'sensor.grid_power',
        name: 'Grid Power',
        type: 'sensors',
        deviceClass: 'power',
        value: '700',
        unit: 'W',
      }),
      device({
        id: 'switch.dishwasher',
        name: 'Dishwasher',
        type: 'switches',
        state: true,
        power: 500,
      }),
      device({
        id: 'climate.living_room',
        name: 'Living Room',
        type: 'climate',
      }),
    ]);

    expect(layout.cardIds).toEqual([
      'switch.dishwasher',
      'sensor.grid_power',
      'climate.living_room',
    ]);
    expect(new Set(layout.cardIds).size).toBe(layout.cardIds.length);
  });

  it('returns an empty sectioned layout when no cards match the pack', () => {
    const layout = buildDashboardPackLayout('security-monitor', [
      device({
        id: 'light.kitchen',
        name: 'Kitchen',
        type: 'lights',
        state: true,
      }),
    ]);

    expect(layout).toEqual({
      mode: 'sectioned',
      showHero: false,
      cardIds: [],
      sections: [],
      cardSectionAssignments: {},
    });
  });
});
