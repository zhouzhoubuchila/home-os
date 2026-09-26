import { LoadingSpinner } from '@navet/app/components/primitives/loading-spinner';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getHousePulse } from '@navet/app/features/chores/chore-dashboard-selectors';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { useChoreWorkspaceSync } from '@navet/app/features/chores/use-chore-workspace-sync';
import { useResolvedHomeOsEntities } from '@navet/app/features/home-os/hooks/use-resolved-home-os';
import {
  buildHomeOsStatusRail,
  type HomeOsRailKind,
} from '@navet/app/features/home-os/projection/home-os-status-rail';
import { useHomeOsConfigStore } from '@navet/app/features/home-os/stores/home-os-config-store';
import { buildHomeStatusSummaryItems } from '@navet/app/features/sensors/components/home-status-summary-model';
import {
  SummaryBar,
  SummaryBarStack,
} from '@navet/app/features/sensors/components/info-badge-strip';
import { useAccentColor, useHomeAssistant, useI18n, useThemeMode } from '@navet/app/hooks';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { Battery, House, Lightbulb, TriangleAlert, Wifi } from 'lucide-react';
import { lazy, memo, Suspense, useMemo } from 'react';
import { useHomeEnergySummary } from '../hooks/use-home-energy-summary';
import { isHomeOsRecommendedSection } from '../packs/dashboard-packs';
import type { CustomCard } from '../stores/custom-cards-store';
import {
  type HomeDashboardOverviewProps,
  useHomeLayoutViewport,
  useHomeOverviewCollections,
} from './home-dashboard-overview.shared';
import { HomePresentation } from './home-dashboard-overview-presentation';

const HomeDashboardOverviewEdit = lazy(() => import('./home-dashboard-overview-edit'));

const railIcons = {
  household: House,
  lighting: Lightbulb,
  alerts: TriangleAlert,
  internet: Wifi,
  battery: Battery,
} as const;

const railColors = {
  household: '#a5b4fc',
  lighting: '#f5d8ab',
  alerts: '#f3bd83',
  internet: '#8fd8f5',
  battery: '#a8c9f5',
} as const;

function HomeOsStatusRail({ cards }: { cards: readonly CustomCard[] }) {
  const { language } = useI18n();
  const entities = useResolvedHomeOsEntities();
  const connected = useHomeAssistant((state) => state.connected);
  const config = useHomeOsConfigStore((state) => state.config);
  const metrics = useMemo(
    () =>
      buildHomeOsStatusRail(
        entities,
        config.functionalDevices ?? [],
        config.alertRules,
        language,
        connected
      ),
    [entities, config.functionalDevices, config.alertRules, language, connected]
  );
  const titles: Record<HomeOsRailKind, string> =
    language === 'zh'
      ? {
          household: '家庭',
          lighting: '灯光',
          alerts: '待处理',
          internet: 'Internet',
          battery: '电池',
        }
      : {
          household: 'Household',
          lighting: 'Lighting',
          alerts: 'Attention',
          internet: 'Internet',
          battery: 'Battery',
        };
  const items = metrics.map((metric) => {
    const card = cards.find((candidate) =>
      metric.kind === 'battery'
        ? candidate.type === 'battery'
        : candidate.type === 'home-os' && candidate.data?.kind === metric.kind
    );
    return {
      id: metric.kind,
      title: titles[metric.kind],
      value: metric.value,
      icon: railIcons[metric.kind],
      iconColor: railColors[metric.kind],
      tone: metric.tone,
      onSelect: card
        ? () => {
            const target = Array.from(
              document.querySelectorAll<HTMLElement>('[data-home-card-id]')
            ).find((element) => element.dataset.homeCardId === card.id);
            target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target?.querySelector<HTMLElement>('[data-home-os-detail]')?.click();
          }
        : undefined,
    };
  });
  return (
    <SummaryBar
      items={items}
      ariaLabel={language === 'zh' ? 'Home OS 家庭状态摘要' : 'Home OS status rail'}
    />
  );
}

type HomeStatusSummaryProps = Pick<
  HomeDashboardOverviewProps,
  'onNavigateSection' | 'routineCount' | 'securityAlertCount' | 'summaryDeviceMap'
>;

const HomeStatusSummary = memo(function HomeStatusSummary({
  onNavigateSection,
  routineCount,
  securityAlertCount,
  summaryDeviceMap,
}: HomeStatusSummaryProps) {
  const { t } = useI18n();
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const advancedCustomizationEnabled = useSettingsStore(
    settingsSelectors.advancedCustomizationEnabled
  );
  const customSummaryPills = useSettingsStore(settingsSelectors.customSummaryPills);
  const choresEnabled = useSettingsStore(settingsSelectors.choresEnabled);
  const energySummary = useHomeEnergySummary();
  const choreWorkspace = useChoreWorkspaceStore((state) => state.data);
  useChoreWorkspaceSync(choresEnabled);
  const choreSummary = useMemo(
    () => (choresEnabled && choreWorkspace ? getHousePulse(choreWorkspace) : undefined),
    [choreWorkspace, choresEnabled]
  );
  const statusSummaryItems = useMemo(
    () =>
      buildHomeStatusSummaryItems(
        summaryDeviceMap,
        {
          gridImportTodayKWh: energySummary.gridImportTodayKWh,
          routineCount,
          securityAlertCount,
          pendingChoreCount: choreSummary?.remaining,
          overdueChoreCount: choreSummary?.overdue,
          temperatureUnit,
          customSummaryPills: advancedCustomizationEnabled ? customSummaryPills : [],
        },
        t
      ),
    [
      advancedCustomizationEnabled,
      customSummaryPills,
      energySummary.gridImportTodayKWh,
      choreSummary,
      routineCount,
      securityAlertCount,
      summaryDeviceMap,
      t,
      temperatureUnit,
    ]
  );

  return onNavigateSection ? (
    <SummaryBar items={statusSummaryItems} onNavigate={onNavigateSection} />
  ) : null;
});

export const HomeDashboardOverview = memo(function HomeDashboardOverview({
  deviceMap,
  summaryDeviceMap,
  cardSizes,
  updateCardSize,
  isEditMode,
  hiddenEntityCount,
  allCustomCards,
  homeLayout,
  canRedoHomeLayout,
  canUndoHomeLayout,
  removeHomeCard,
  moveHomeCard,
  setHomeLayoutMode,
  addHomeSection,
  addHomeColumnSection,
  addHomeSectionBelow,
  moveHomeSection,
  moveHomeColumn,
  renameHomeSection,
  removeHomeSection,
  resizeHomeSection,
  redoHomeLayout,
  undoHomeLayout,
  onOpenAddCardDialog,
  onApplyDashboardPack,
  onUpdateCard,
  onToggleEditMode,
  onNavigateSection,
  routineCount,
  securityAlertCount,
  densePerformanceMode = false,
}: HomeDashboardOverviewProps) {
  const { t } = useI18n();
  const theme = useThemeMode();
  const accentColor = useAccentColor();
  const showHomeSummaryBar = useSettingsStore(settingsSelectors.showHomeSummaryBar);
  const disableAnimations = useSettingsStore((state) => state.disableAnimations);
  const lowPowerMode = useSettingsStore((state) => state.lowPowerMode);
  const effectsQuality = useSettingsStore((state) => state.effectsQuality);
  const { effectiveCols: sectionGridCols, isPortrait: isPortraitHome } = useHomeLayoutViewport();
  const surface = getThemeSurfaceTokens(theme);
  const { allCards, flowCards, sectionCards } = useHomeOverviewCollections({
    deviceMap,
    allCustomCards,
    homeLayout,
  });
  const isRecommendedHome = homeLayout.sections.some((section) =>
    isHomeOsRecommendedSection(section.id)
  );
  const infoBadgeStrip =
    showHomeSummaryBar && isRecommendedHome && !isEditMode ? (
      <HomeOsStatusRail
        cards={allCustomCards.filter((card) => homeLayout.cardIds.includes(card.id))}
      />
    ) : showHomeSummaryBar && onNavigateSection ? (
      <HomeStatusSummary
        summaryDeviceMap={summaryDeviceMap}
        routineCount={routineCount}
        securityAlertCount={securityAlertCount}
        onNavigateSection={onNavigateSection}
      />
    ) : null;
  const presentation = (
    <SummaryBarStack
      className={isRecommendedHome ? 'home-os-v3-surface' : undefined}
      data-home-os-motion-policy={
        isRecommendedHome
          ? disableAnimations
            ? 'off'
            : lowPowerMode || effectsQuality === 'low'
              ? 'low'
              : 'normal'
          : undefined
      }
    >
      {infoBadgeStrip}
      <HomePresentation
        flowCards={flowCards}
        sections={sectionCards}
        allCards={allCards}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        onUpdateCard={onUpdateCard}
        showHero={homeLayout.showHero}
        isSectioned={homeLayout.mode === 'sectioned'}
        gridCols={sectionGridCols}
        isPortraitHome={isPortraitHome}
        accentColor={accentColor}
        surface={surface}
        emptyTitle={t('dashboard.homeOverview.emptyTitle')}
        emptyDescription={t('dashboard.homeOverview.emptyDescription')}
        densePerformanceMode={densePerformanceMode}
        onToggleEditMode={onToggleEditMode}
      />
    </SummaryBarStack>
  );

  if (!isEditMode) {
    return presentation;
  }

  return (
    <Suspense fallback={<LoadingSpinner message={t('common.loading')} />}>
      <HomeDashboardOverviewEdit
        deviceMap={deviceMap}
        summaryDeviceMap={summaryDeviceMap}
        cardSizes={cardSizes}
        updateCardSize={updateCardSize}
        isEditMode={isEditMode}
        hiddenEntityCount={hiddenEntityCount}
        allCustomCards={allCustomCards}
        homeLayout={homeLayout}
        canRedoHomeLayout={canRedoHomeLayout}
        canUndoHomeLayout={canUndoHomeLayout}
        removeHomeCard={removeHomeCard}
        moveHomeCard={moveHomeCard}
        setHomeLayoutMode={setHomeLayoutMode}
        addHomeSection={addHomeSection}
        addHomeColumnSection={addHomeColumnSection}
        addHomeSectionBelow={addHomeSectionBelow}
        moveHomeSection={moveHomeSection}
        moveHomeColumn={moveHomeColumn}
        renameHomeSection={renameHomeSection}
        removeHomeSection={removeHomeSection}
        resizeHomeSection={resizeHomeSection}
        redoHomeLayout={redoHomeLayout}
        undoHomeLayout={undoHomeLayout}
        onOpenAddCardDialog={onOpenAddCardDialog}
        onApplyDashboardPack={onApplyDashboardPack}
        onUpdateCard={onUpdateCard}
        onToggleEditMode={onToggleEditMode}
        infoBadgeStrip={infoBadgeStrip}
      />
    </Suspense>
  );
});
