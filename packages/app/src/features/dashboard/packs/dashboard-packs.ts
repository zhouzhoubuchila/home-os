import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { defaultTranslate, type TranslateFn, type TranslationKey } from '@navet/app/i18n';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { HomeDashboardLayoutState } from '../hooks/use-home-dashboard-layout';
import type { CustomCard } from '../stores/custom-cards-store';

export type DashboardPackId =
  | 'command-center'
  | 'security-monitor'
  | 'energy-wall'
  | 'home-os-recommended';

export interface DashboardPackDefinition {
  id: DashboardPackId;
  labelKey: TranslationKey;
}

interface DashboardPackSectionDefinition {
  id: string;
  titleKey: TranslationKey;
  width: number;
  select: (devices: DeviceWithType[]) => string[];
}

export const DASHBOARD_PACKS: DashboardPackDefinition[] = [
  {
    id: 'home-os-recommended',
    labelKey: 'dashboard.packs.homeOsRecommended',
  },
  {
    id: 'command-center',
    labelKey: 'dashboard.packs.commandCenter',
  },
  {
    id: 'security-monitor',
    labelKey: 'dashboard.packs.securityMonitor',
  },
  {
    id: 'energy-wall',
    labelKey: 'dashboard.packs.energyWall',
  },
];

const MAX_SECTION_CARDS = 8;

function uniqueCardIds(ids: string[], usedIds: Set<string>) {
  const result: string[] = [];

  for (const id of ids) {
    if (usedIds.has(id)) {
      continue;
    }

    usedIds.add(id);
    result.push(id);
  }

  return result.slice(0, MAX_SECTION_CARDS);
}

function compareByName(left: DeviceWithType, right: DeviceWithType) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function hasEnergySignal(device: DeviceWithType) {
  if (device.type === 'switches' && (device.power !== undefined || device.energy !== undefined)) {
    return true;
  }

  if ('deviceClass' in device) {
    return ['battery', 'energy', 'power', 'voltage'].includes(device.deviceClass ?? '');
  }

  return false;
}

function isSecurityAttentionDevice(device: DeviceWithType) {
  return (
    device.securitySeverity === 'critical' ||
    device.securitySeverity === 'warning' ||
    device.securitySeverity === 'active' ||
    device.securitySeverity === 'unknown'
  );
}

function byType(devices: DeviceWithType[], types: Array<DeviceWithType['type']>) {
  const typeSet = new Set(types);
  return devices
    .filter((device) => typeSet.has(device.type))
    .sort(compareByName)
    .map((device) => device.id);
}

function securityAttention(devices: DeviceWithType[]) {
  return devices
    .filter(isSecurityAttentionDevice)
    .sort((left, right) => {
      const order = { critical: 0, warning: 1, active: 2, unknown: 3, normal: 4 };
      return (
        order[left.securitySeverity ?? 'normal'] - order[right.securitySeverity ?? 'normal'] ||
        compareByName(left, right)
      );
    })
    .map((device) => device.id);
}

function energyDevices(devices: DeviceWithType[]) {
  return devices
    .filter(hasEnergySignal)
    .sort(compareByName)
    .map((device) => device.id);
}

function makeSectionDefinitions(packId: DashboardPackId): DashboardPackSectionDefinition[] {
  switch (packId) {
    case 'home-os-recommended':
      return [];
    case 'security-monitor':
      return [
        {
          id: 'access',
          titleKey: 'dashboard.packs.section.access',
          width: 6,
          select: (devices) => [
            ...securityAttention(devices),
            ...byType(devices, ['locks', 'covers']),
          ],
        },
        {
          id: 'cameras',
          titleKey: 'dashboard.packs.section.cameras',
          width: 6,
          select: (devices) => byType(devices, ['cameras']),
        },
        {
          id: 'presence',
          titleKey: 'dashboard.packs.section.presence',
          width: 6,
          select: (devices) => byType(devices, ['persons', 'sensors']),
        },
      ];
    case 'energy-wall':
      return [
        {
          id: 'energy',
          titleKey: 'dashboard.packs.section.liveEnergy',
          width: 6,
          select: energyDevices,
        },
        {
          id: 'climate',
          titleKey: 'dashboard.packs.section.climateLoad',
          width: 6,
          select: (devices) => byType(devices, ['climate', 'hvac', 'fans', 'weather']),
        },
        {
          id: 'devices',
          titleKey: 'dashboard.packs.section.deviceDraw',
          width: 6,
          select: (devices) => byType(devices, ['switches', 'sensors']),
        },
      ];
    case 'command-center':
      return [
        {
          id: 'attention',
          titleKey: 'dashboard.packs.section.needsAttention',
          width: 6,
          select: (devices) => [...securityAttention(devices), ...energyDevices(devices)],
        },
        {
          id: 'comfort',
          titleKey: 'dashboard.packs.section.comfort',
          width: 6,
          select: (devices) => byType(devices, ['weather', 'climate', 'hvac', 'lights']),
        },
        {
          id: 'household',
          titleKey: 'dashboard.packs.section.household',
          width: 4,
          select: (devices) => byType(devices, ['calendars', 'persons', 'media']),
        },
        {
          id: 'actions',
          titleKey: 'dashboard.packs.section.quickActions',
          width: 4,
          select: (devices) => byType(devices, ['scenes', 'switches']),
        },
      ];
  }
}

const HOME_OS_RECOMMENDED_GROUPS = [
  { id: 'daily', titleKey: 'dashboard.packs.section.daily', kinds: ['lunar', 'weather'] },
  {
    id: 'home',
    titleKey: 'dashboard.packs.section.home',
    kinds: ['household', 'lighting', 'device-health', 'alerts'],
  },
  {
    id: 'infrastructure',
    titleKey: 'dashboard.packs.section.infrastructure',
    kinds: ['pve', 'home-assistant', 'router', 'internet'],
  },
  { id: 'utilities', titleKey: 'dashboard.packs.section.utilities', kinds: ['electricity', 'gas'] },
] as const;

const HOME_OS_RECOMMENDED_SIZES: Record<string, CardSize> = {
  lunar: 'extra-large',
  weather: 'extra-large',
  household: 'medium',
  lighting: 'medium',
  'device-health': 'medium',
  alerts: 'medium',
  pve: 'medium',
  'home-assistant': 'medium',
  router: 'medium',
  internet: 'medium',
  electricity: 'medium',
  gas: 'medium',
};

const HOME_OS_RECOMMENDED_SECTION_PREFIX = 'dashboard-pack-home-os-recommended-';

/** Use two medium cards per row inside the full-width recommended sections. */
export function getHomeOsRecommendedSectionGridCols(sectionId: string, availableCols: number) {
  if (!sectionId.startsWith(HOME_OS_RECOMMENDED_SECTION_PREFIX) || sectionId.endsWith('-daily')) {
    return availableCols;
  }
  return Math.min(availableCols, 4);
}

/** Reorders only cards already selected on this dashboard; applying it is an explicit user action. */
export function buildHomeOsRecommendedLayout(
  current: HomeDashboardLayoutState,
  customCards: readonly CustomCard[],
  t: TranslateFn = defaultTranslate
): { layout: HomeDashboardLayoutState; cardSizes: Record<string, CardSize> } {
  const selectedIds = new Set(current.cardIds);
  const byKind = new Map<string, string[]>();
  let batteryId: string | undefined;
  for (const card of customCards) {
    if (!selectedIds.has(card.id)) continue;
    if (card.type === 'battery' && !batteryId) batteryId = card.id;
    if (card.type !== 'home-os' || typeof card.data?.kind !== 'string') continue;
    const ids = byKind.get(card.data.kind) ?? [];
    ids.push(card.id);
    byKind.set(card.data.kind, ids);
  }

  const usedIds = new Set<string>();
  const cardSizes: Record<string, CardSize> = {};
  const grouped = HOME_OS_RECOMMENDED_GROUPS.map((group) => {
    const cardIds = group.kinds.flatMap((kind) => byKind.get(kind) ?? []);
    for (const kind of group.kinds) {
      for (const id of byKind.get(kind) ?? []) {
        usedIds.add(id);
        cardSizes[id] = HOME_OS_RECOMMENDED_SIZES[kind];
      }
    }
    return { id: group.id, titleKey: group.titleKey, cardIds };
  });
  if (batteryId && !usedIds.has(batteryId)) {
    grouped[3].cardIds.push(batteryId);
    usedIds.add(batteryId);
    cardSizes[batteryId] = 'medium';
  }
  grouped[3].cardIds.push(...current.cardIds.filter((id) => !usedIds.has(id)));

  const sections = grouped.flatMap((group) =>
    group.cardIds.length
      ? [
          {
            id: `${HOME_OS_RECOMMENDED_SECTION_PREFIX}${group.id}`,
            title: t(group.titleKey),
            x: 0,
            y: 0,
            w: 12,
            h: 1,
            span: 12,
            cardIds: group.cardIds,
          },
        ]
      : []
  );
  sections.forEach((section, index) => {
    section.y = index;
  });
  return {
    layout: {
      mode: 'sectioned',
      showHero: true,
      cardIds: sections.flatMap((section) => section.cardIds),
      sections: sections.map(({ cardIds: _cardIds, ...section }) => section),
      cardSectionAssignments: Object.fromEntries(
        sections.flatMap((section) => section.cardIds.map((id) => [id, section.id]))
      ),
    },
    cardSizes,
  };
}

export function buildDashboardPackLayout(
  packId: DashboardPackId,
  devices: Iterable<DeviceWithType>,
  t: TranslateFn = defaultTranslate
): HomeDashboardLayoutState {
  const sortedDevices = Array.from(devices).sort(compareByName);
  const usedCardIds = new Set<string>();
  let sectionIndex = 0;
  const sections = makeSectionDefinitions(packId).flatMap((definition) => {
    const cardIds = uniqueCardIds(definition.select(sortedDevices), usedCardIds);

    if (cardIds.length === 0) {
      return [];
    }

    const index = sectionIndex;
    sectionIndex += 1;

    return [
      {
        id: `dashboard-pack-${packId}-${definition.id}`,
        title: t(definition.titleKey),
        x: index % 2 === 0 ? 0 : 6,
        y: Math.floor(index / 2),
        w: definition.width,
        h: 1,
        span: definition.width,
        cardIds,
      },
    ];
  });
  const cardIds = sections.flatMap((section) => section.cardIds);
  const cardSectionAssignments = Object.fromEntries(
    sections.flatMap((section) => section.cardIds.map((cardId) => [cardId, section.id]))
  );

  return {
    mode: 'sectioned',
    showHero: false,
    cardIds,
    sections: sections.map(({ cardIds: _cardIds, ...section }) => section),
    cardSectionAssignments,
  };
}
