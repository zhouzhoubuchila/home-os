import {
  type CardSize,
  getCardSpanClass,
  getResponsiveCardSize,
} from '@navet/app/components/shared/card-size-selector';
import { getHomeOsMotionTier } from '@navet/app/components/shared/theme/lunar-series-surface';
import { cn } from '@navet/app/components/ui/utils';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { memo } from 'react';
import { useHomeGridRuntime } from '../hooks/use-home-grid-runtime';
import {
  getHomeOsRecommendedHeroOffset,
  isHomeOsRecommendedSingleColumnHero,
} from '../packs/dashboard-packs';
import type { CustomCard } from '../stores/custom-cards-store';
import { DashboardCardItem } from './dashboard-card-item';
import { areCardIdsStable, isCustomCard } from './home-dashboard-overview.shared';

interface PresentationCardGridProps {
  cardIds: string[];
  sectionId?: string;
  gridCols?: number;
  allCards: Map<string, DeviceWithType | CustomCard>;
  cardSizes: Record<string, CardSize>;
  updateCardSize: (id: string, size: CardSize) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  showHero: boolean;
  densePerformanceMode?: boolean;
}

export const PresentationCardGrid = memo(function PresentationCardGrid({
  cardIds,
  sectionId,
  gridCols,
  allCards,
  cardSizes,
  updateCardSize,
  onUpdateCard,
  showHero,
  densePerformanceMode = false,
}: PresentationCardGridProps) {
  const {
    breakpointCols,
    gridPlacements,
    gridStyle,
    innerContainerStyle,
    innerRef,
    isAutoScaled,
    optimizeOffscreenPaint,
    outerContainerStyle,
    outerRef,
    renderedGridCols,
    visibleCardIds,
  } = useHomeGridRuntime({
    allCards,
    cardIds,
    cardSizes,
    densePerformanceMode,
    gridCols,
    isEditMode: false,
  });
  const heroOffset = getHomeOsRecommendedHeroOffset(
    sectionId,
    cardIds,
    cardSizes,
    renderedGridCols
  );
  const expandSingleColumnHero = isHomeOsRecommendedSingleColumnHero(sectionId, renderedGridCols);

  return (
    <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
      <div
        ref={innerRef}
        className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
        style={innerContainerStyle}
      >
        <div className="grid w-full gap-3 lg:gap-4" style={gridStyle}>
          {visibleCardIds.map((cardId) => {
            const entry = allCards.get(cardId);
            if (!entry) {
              return null;
            }

            const size = cardSizes[cardId] ?? entry.size;
            const resolvedGridSize = getResponsiveCardSize(size, breakpointCols);
            const placement = gridPlacements.get(cardId);
            const kind = isCustomCard(entry)
              ? entry.type === 'home-os' && typeof entry.data?.kind === 'string'
                ? entry.data.kind
                : entry.type
              : undefined;

            return (
              <div
                key={cardId}
                data-home-card-id={cardId}
                data-home-os-motion-tier={getHomeOsMotionTier(kind)}
                className={cn(
                  getCardSpanClass(resolvedGridSize),
                  expandSingleColumnHero && 'col-span-full md:col-span-full',
                  '[&>*]:h-full'
                )}
                style={{
                  gridColumnStart: placement ? placement.column + heroOffset : undefined,
                  gridRowStart: placement?.row,
                }}
              >
                {!isCustomCard(entry) ? (
                  <DashboardCardItem
                    id={cardId}
                    device={entry}
                    size={size}
                    isEditMode={false}
                    handleSizeChange={updateCardSize}
                    allowExtraLargeSizes={showHero}
                    densePerformanceMode={densePerformanceMode}
                    optimizeOffscreenPaint={optimizeOffscreenPaint}
                  />
                ) : (
                  <DashboardCardItem
                    id={cardId}
                    card={entry}
                    size={size}
                    isEditMode={false}
                    handleSizeChange={updateCardSize}
                    onUpdateCard={onUpdateCard}
                    allowExtraLargeSizes={showHero}
                    densePerformanceMode={densePerformanceMode}
                    optimizeOffscreenPaint={optimizeOffscreenPaint}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}, arePresentationCardGridPropsEqual);

function arePresentationCardGridPropsEqual(
  previous: PresentationCardGridProps,
  next: PresentationCardGridProps
) {
  return (
    previous.gridCols === next.gridCols &&
    previous.sectionId === next.sectionId &&
    previous.updateCardSize === next.updateCardSize &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.showHero === next.showHero &&
    previous.densePerformanceMode === next.densePerformanceMode &&
    areCardIdsStable(
      previous.cardIds,
      next.cardIds,
      previous.allCards,
      next.allCards,
      previous.cardSizes,
      next.cardSizes
    )
  );
}
