import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { SummaryBar } from '@navet/app/features/sensors/components/info-badge-strip';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Battery, House, Lightbulb, TriangleAlert, Wifi } from 'lucide-react';
import { useEffect } from 'react';
import { buildHomeOverviewCollections } from '../components/home-dashboard-overview.shared';
import { HomePresentation } from '../components/home-dashboard-overview-presentation';
import type { HomeDashboardLayoutState } from '../hooks/use-home-dashboard-layout';
import type { CustomCard } from '../stores/custom-cards-store';
import { buildHomeOsRecommendedLayout } from './dashboard-packs';

const kinds = [
  'lunar',
  'weather',
  'household',
  'modes',
  'lighting',
  'calendar',
  'cleaning',
  'device-health',
  'alerts',
  'pve',
  'home-assistant',
  'router',
  'internet',
  'electricity',
  'gas',
];
const cards: CustomCard[] = [
  ...kinds.map((kind) => ({
    id: `fixture-${kind}`,
    type: 'home-os' as const,
    size: 'medium' as const,
    room: 'All',
    data: { kind },
    createdAt: 0,
  })),
  { id: 'fixture-battery', type: 'battery', size: 'medium', room: 'All', createdAt: 0 },
  { id: 'fixture-media', type: 'media-stack', size: 'medium', room: 'All', createdAt: 0 },
];
const original: HomeDashboardLayoutState = {
  mode: 'flow',
  showHero: true,
  cardIds: cards.map((card) => card.id),
  sections: [],
  cardSectionAssignments: {},
};
const recommended = buildHomeOsRecommendedLayout(original, cards);
const collections = buildHomeOverviewCollections({
  deviceMap: new Map(),
  allCustomCards: cards,
  homeLayout: recommended.layout,
});
function duplicateCard(sourceId: string, id: string, createdAt: number): CustomCard {
  const source = cards.find((card) => card.id === sourceId);
  if (!source) throw new Error(`Missing Storybook card: ${sourceId}`);
  return { ...source, id, createdAt };
}
const duplicateCards: CustomCard[] = [
  ...cards,
  duplicateCard('fixture-lunar', 'fixture-lunar-2', 2),
  duplicateCard('fixture-lunar', 'fixture-lunar-3', 3),
  duplicateCard('fixture-weather', 'fixture-weather-2', 2),
  duplicateCard('fixture-battery', 'fixture-battery-2', 2),
  duplicateCard('fixture-media', 'fixture-media-2', 2),
];
const duplicateOriginal: HomeDashboardLayoutState = {
  ...original,
  cardIds: duplicateCards.map((card) => card.id),
};
const duplicateRecommended = buildHomeOsRecommendedLayout(duplicateOriginal, duplicateCards);
const duplicateCollections = buildHomeOverviewCollections({
  deviceMap: new Map(),
  allCustomCards: duplicateCards,
  homeLayout: duplicateRecommended.layout,
});

function RecommendedLayoutFixture({
  scenario = 'normal',
  motionPolicy = 'normal',
  duplicateCanonical = false,
}: {
  scenario?: 'normal' | 'unavailable' | 'warning';
  motionPolicy?: 'normal' | 'low' | 'off';
  duplicateCanonical?: boolean;
}) {
  const gridCols = useBreakpointCols();
  const activeRecommended = duplicateCanonical ? duplicateRecommended : recommended;
  const activeCollections = duplicateCanonical ? duplicateCollections : collections;
  useEffect(() => {
    const previousTheme = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme('dark');
    return () => {
      useThemeStore.getState().setTheme(previousTheme);
    };
  }, []);
  return (
    <main
      className="home-os-v3-surface min-h-screen bg-slate-950 px-5 py-6 text-slate-100 md:px-8"
      data-home-os-motion-policy={motionPolicy}
      data-qa-scenario={scenario}
    >
      <p className="mb-5 text-xs text-slate-400">
        Layout QA fixture · {scenario} · no live Home Assistant telemetry
      </p>
      <div className="mb-3">
        <SummaryBar
          items={[
            {
              id: 'household',
              title: 'Household',
              value: scenario === 'unavailable' ? 'Unknown' : '1 / 2 home',
              icon: House,
              iconColor: '#a5b4fc',
            },
            {
              id: 'lighting',
              title: 'Lighting',
              value: '2 on',
              icon: Lightbulb,
              iconColor: '#f5d8ab',
            },
            {
              id: 'alerts',
              title: 'Attention',
              value: scenario === 'warning' ? '2 need attention' : 'All clear',
              icon: TriangleAlert,
              iconColor: '#f3bd83',
              tone: scenario === 'warning' ? 'warning' : 'success',
            },
            {
              id: 'internet',
              title: 'Internet',
              value: scenario === 'unavailable' ? 'Unknown' : 'Online',
              icon: Wifi,
              iconColor: '#8fd8f5',
            },
            {
              id: 'battery',
              title: 'Battery',
              value: scenario === 'warning' ? '1 low' : '0 low',
              icon: Battery,
              iconColor: '#a8c9f5',
            },
          ]}
        />
      </div>
      <HomePresentation
        flowCards={activeCollections.flowCards}
        sections={activeCollections.sectionCards}
        gridCols={gridCols}
        isPortraitHome={false}
        allCards={activeCollections.allCards}
        cardSizes={activeRecommended.cardSizes}
        updateCardSize={() => {}}
        showHero={activeRecommended.layout.showHero}
        isSectioned
        accentColor="#78b9eb"
        surface={getThemeSurfaceTokens('dark')}
        emptyTitle="Empty"
        emptyDescription=""
      />
    </main>
  );
}

const meta = {
  title: 'Pages/Home Dashboard/Recommended Layout QA',
  component: RecommendedLayoutFixture,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RecommendedLayoutFixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {};
export const Unavailable: Story = { args: { scenario: 'unavailable' } };
export const Warning: Story = { args: { scenario: 'warning' } };
export const LowEffects: Story = { args: { motionPolicy: 'low' } };
export const ReducedMotion: Story = { args: { motionPolicy: 'off' } };
export const TabletLandscape: Story = {
  globals: { viewport: { value: 'ipadPro', isRotated: true } },
};
export const TabletPortrait: Story = {
  globals: { viewport: { value: 'ipadPro', isRotated: false } },
};
export const Mobile: Story = {
  globals: { viewport: { value: 'iphone14', isRotated: false } },
};
export const Desktop: Story = {
  globals: { viewport: { value: 'desktop1080p', isRotated: false } },
};
export const DuplicateCanonicalCards: Story = {
  args: { duplicateCanonical: true },
  globals: { viewport: { value: 'desktop1080p', isRotated: false } },
};
