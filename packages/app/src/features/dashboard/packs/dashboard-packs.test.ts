import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  buildHomeOverviewTopology,
  buildSectionStacks,
} from '../components/home-dashboard-overview.shared';
import { packDashboardGridItems } from '../device-grid/device-grid-layout';
import type { HomeDashboardLayoutState } from '../hooks/use-home-dashboard-layout';
import type { CustomCard } from '../stores/custom-cards-store';
import {
  buildDashboardPackLayout,
  buildHomeOsRecommendedLayout,
  getHomeOsRecommendedHeroOffset,
  getHomeOsRecommendedSectionGridCols,
  isHomeOsRecommendedSingleColumnHero,
} from './dashboard-packs';

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
      'modes',
      'calendar',
      'cleaning',
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
    cards.push({ id: 'media', type: 'media-stack', size: 'small', room: 'All', createdAt: 0 });
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
      sections: [{ id: 'old-position', title: 'Old', x: 6, y: 8, w: 6, h: 1, span: 6 }],
      cardSectionAssignments: { pve: 'old-position' },
    };
    const { layout, cardSizes } = buildHomeOsRecommendedLayout(original, cards);
    expect(original.mode).toBe('flow');
    expect(original.cardIds[0]).toBe('internet');
    expect(layout.mode).toBe('sectioned');
    expect(layout.cardIds).toEqual([
      'lunar',
      'weather',
      'household',
      'modes',
      'lighting',
      'calendar',
      'alerts',
      'media',
      'cleaning',
      'battery',
      'internet',
      'router',
      'home-assistant',
      'pve',
      'electricity',
      'gas',
      'extra',
    ]);
    expect(layout.sections.map((section) => section.title)).toEqual([
      'Daily',
      'Home',
      'Infrastructure',
      'Energy & Utilities',
    ]);
    expect(layout.sections.every((section) => section.w === 12)).toBe(true);
    expect(layout.sections.map((section) => [section.x, section.y])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    expect(cardSizes.lunar).toBe('extra-large');
    expect(cardSizes.weather).toBe('extra-large');
    for (const kind of kinds.filter(
      (kind) => !['lunar', 'weather', 'device-health'].includes(kind)
    )) {
      expect(cardSizes[kind]).toBe('medium');
    }
    expect(cardSizes.battery).toBe('medium');
    expect(cardSizes.media).toBe('medium');
    expect(cardSizes['device-health']).toBeUndefined();
    expect(cardSizes.extra).toBeUndefined();
    expect(new Set(layout.cardIds).size).toBe(layout.cardIds.length);

    const topology = buildHomeOverviewTopology({
      availableCardIds: new Set(layout.cardIds),
      homeLayout: layout,
    });
    expect(topology.flowCards).toEqual([]);
    expect(topology.sectionCards.map((section) => section.cardIds)).toEqual([
      ['lunar', 'weather'],
      ['household', 'modes', 'lighting', 'calendar', 'alerts', 'media', 'cleaning', 'battery'],
      ['internet', 'router', 'home-assistant', 'pve'],
      ['electricity', 'gas', 'extra'],
    ]);
    expect(
      buildSectionStacks(topology.sectionCards)
        .flat(2)
        .map((section) => section.id)
    ).toEqual(layout.sections.map((section) => section.id));

    const daily = topology.sectionCards[0];
    const home = topology.sectionCards[1];
    const infrastructure = topology.sectionCards[2];
    const utilities = topology.sectionCards[3];
    expect(getHomeOsRecommendedSectionGridCols(daily.id, 6)).toBe(6);
    for (const section of [home, infrastructure, utilities]) {
      expect(getHomeOsRecommendedSectionGridCols(section.id, 6)).toBe(6);
      expect(getHomeOsRecommendedSectionGridCols(section.id, 12)).toBe(8);
    }
    expect(getHomeOsRecommendedSectionGridCols('custom-section', 12)).toBe(12);
    expect(getHomeOsRecommendedHeroOffset(daily.id, daily.cardIds, cardSizes, 16)).toBe(2);
    expect(getHomeOsRecommendedHeroOffset(daily.id, daily.cardIds, cardSizes, 4)).toBe(0);
    expect(isHomeOsRecommendedSingleColumnHero(daily.id, 8)).toBe(true);
    expect(isHomeOsRecommendedSingleColumnHero(daily.id, 12)).toBe(false);
    expect(isHomeOsRecommendedSingleColumnHero('custom-section', 8)).toBe(false);
    const dailyPlacements = packDashboardGridItems(
      daily.cardIds.map((id) => ({ id, size: cardSizes[id] })),
      12
    );
    expect(dailyPlacements.get('lunar')).toEqual({ column: 1, row: 1 });
    expect(dailyPlacements.get('weather')).toEqual({ column: 7, row: 1 });
    const homePlacements = packDashboardGridItems(
      home.cardIds.map((id) => ({ id, size: cardSizes[id] })),
      16
    );
    expect(home.cardIds.map((id) => homePlacements.get(id))).toEqual([
      { column: 1, row: 1 },
      { column: 5, row: 1 },
      { column: 9, row: 1 },
      { column: 13, row: 1 },
      { column: 1, row: 3 },
      { column: 5, row: 3 },
      { column: 9, row: 3 },
      { column: 13, row: 3 },
    ]);
    const infraPlacements = packDashboardGridItems(
      infrastructure.cardIds.map((id) => ({ id, size: cardSizes[id] })),
      16
    );
    expect(infrastructure.cardIds.map((id) => infraPlacements.get(id))).toEqual([
      { column: 1, row: 1 },
      { column: 5, row: 1 },
      { column: 9, row: 1 },
      { column: 13, row: 1 },
    ]);
    const utilityPlacements = packDashboardGridItems(
      utilities.cardIds.slice(0, 2).map((id) => ({ id, size: cardSizes[id] })),
      12
    );
    expect(utilityPlacements.get('electricity')).toEqual({ column: 1, row: 1 });
  });

  it('only adds existing cards when the user explicitly applies the recommendation', () => {
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
    expect(buildHomeOsRecommendedLayout(current, cards).layout.cardIds).toEqual([
      'lunar',
      'weather',
    ]);
    expect(current.cardIds).toEqual(['weather']);
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
