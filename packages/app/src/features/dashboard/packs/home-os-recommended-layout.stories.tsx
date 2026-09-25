import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useThemeStore } from '@navet/app/stores/theme-store';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { buildHomeOverviewCollections } from '../components/home-dashboard-overview.shared';
import { HomePresentation } from '../components/home-dashboard-overview-presentation';
import type { HomeDashboardLayoutState } from '../hooks/use-home-dashboard-layout';
import type { CustomCard } from '../stores/custom-cards-store';
import { buildHomeOsRecommendedLayout } from './dashboard-packs';

const kinds = [
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

function RecommendedLayoutFixture() {
  const [gridCols, setGridCols] = useState(() => (window.innerWidth < 768 ? 2 : 6));
  useEffect(() => {
    const previousTheme = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme('dark');
    const onResize = () => setGridCols(window.innerWidth < 768 ? 2 : 6);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      useThemeStore.getState().setTheme(previousTheme);
    };
  }, []);
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100 md:px-8">
      <p className="mb-5 text-xs text-slate-400">
        Layout QA fixture · no live Home Assistant telemetry
      </p>
      <HomePresentation
        flowCards={collections.flowCards}
        sections={collections.sectionCards}
        gridCols={gridCols}
        isPortraitHome={false}
        allCards={collections.allCards}
        cardSizes={recommended.cardSizes}
        updateCardSize={() => {}}
        showHero={recommended.layout.showHero}
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
export const FullHome: Story = {};
