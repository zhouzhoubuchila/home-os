import type { TranslateFn, TranslationKey } from '@navet/app/i18n';
import type { Section } from '@navet/app/navigation/sections';
import {
  Camera,
  CircuitBoard,
  DoorOpen,
  Home,
  type LucideIcon,
  Network,
  Settings,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

export interface SectionNavigationItem {
  icon: LucideIcon;
  label: string;
  section: Section;
}

const SECTION_NAVIGATION_CONFIG: Array<{
  icon: LucideIcon;
  labelKey: TranslationKey;
  section: Section;
}> = [
  { icon: Home, labelKey: 'sidebar.home', section: 'home' },
  { icon: DoorOpen, labelKey: 'sidebar.rooms', section: 'rooms' },
  { icon: CircuitBoard, labelKey: 'sidebar.devices', section: 'devices' },
  { icon: Zap, labelKey: 'sidebar.energy', section: 'energy' },
  { icon: Camera, labelKey: 'sidebar.cameras', section: 'cameras' },
  { icon: Network, labelKey: 'sidebar.homelab', section: 'homelab' },
  { icon: Sparkles, labelKey: 'sidebar.scenes', section: 'scenes' },
  { icon: Users, labelKey: 'sidebar.family', section: 'family' },
  { icon: Settings, labelKey: 'sidebar.settings', section: 'settings' },
];

export const MOBILE_SECTION_DOCK_ORDER: Section[] = ['home'];

export const MOBILE_SECTION_ORBIT_ORDER: Section[] = [
  'home',
  'rooms',
  'devices',
  'energy',
  'cameras',
  'homelab',
  'scenes',
  'family',
  'settings',
];

export function getSectionNavigationItems(
  t: TranslateFn,
  choresEnabled = true
): SectionNavigationItem[] {
  return SECTION_NAVIGATION_CONFIG.map(({ icon, labelKey, section }) => ({
    icon,
    label: t(section === 'tasks' && !choresEnabled ? 'sections.tasks.title' : labelKey),
    section,
  }));
}

export function getSectionNavigationItemMap(t: TranslateFn, choresEnabled = true) {
  return new Map<Section, SectionNavigationItem>(
    getSectionNavigationItems(t, choresEnabled).map(
      (item) => [item.section, item] satisfies [Section, SectionNavigationItem]
    )
  );
}

export function getOrderedSectionNavigationItems(
  t: TranslateFn,
  order: Section[],
  choresEnabled = true
): SectionNavigationItem[] {
  const itemMap = getSectionNavigationItemMap(t, choresEnabled);
  return order
    .map((section) => itemMap.get(section))
    .filter((item): item is SectionNavigationItem => item !== undefined);
}

export function getRecentSectionNavigationItems(
  t: TranslateFn,
  recentSections: Section[],
  lastNonHomeSection: Section | null,
  choresEnabled = true
): SectionNavigationItem[] {
  const itemMap = getSectionNavigationItemMap(t, choresEnabled);

  if (recentSections.length > 0) {
    return recentSections
      .map((section) => itemMap.get(section))
      .filter((item): item is SectionNavigationItem => item !== undefined);
  }

  if (!lastNonHomeSection) {
    return [];
  }

  const lastSection = itemMap.get(lastNonHomeSection);
  return lastSection ? [lastSection] : [];
}
