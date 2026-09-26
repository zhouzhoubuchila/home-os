import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { getCustomCardTintSurface } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { HOME_WIDGET_ROOM } from '@navet/app/constants/rooms';
import { useAreaRooms, useI18n, useProviderBatterySensorRows, useTheme } from '@navet/app/hooks';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { Battery, Settings2 } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  lazy,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BatteryList, getLevelColor, getLunarLevelColor } from './battery-list';
import { buildBatteryOverviewModel } from './battery-overview-model';
import './battery-lunar-card.css';
import { useDashboardWidgetRoomOptions } from './use-widget-room-options';

const BatterySettingsDialog = lazy(async () => {
  const module = await import('./battery-settings-dialog');
  return { default: module.BatterySettingsDialog };
});

export interface BatteryOverviewWidgetData {
  selectedEntityIds?: string[];
  tintColor?: string;
  visualVariant?: 'default' | 'lunar';
}

interface BatteryOverviewWidgetProps {
  size?: CardSize;
  data?: BatteryOverviewWidgetData;
  onUpdate?: (data: BatteryOverviewWidgetData) => void;
  isEditMode?: boolean;
  room?: string;
  onRoomChange?: (room: string) => void;
  openSettingsRequestKey?: number;
}

function getSelectedEntityIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export const BatteryOverviewWidget = memo(function BatteryOverviewWidget({
  size = 'large',
  data,
  onUpdate,
  isEditMode = false,
  room,
  onRoomChange,
  openSettingsRequestKey = 0,
}: BatteryOverviewWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t, language } = useI18n();
  const effectsQuality = useEffectiveEffectsQuality();
  const disableAnimations = useSettingsStore(settingsSelectors.disableAnimations);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const motion = disableAnimations ? 'off' : lowPowerMode ? 'low' : effectsQuality;
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const visualVariant = data?.visualVariant ?? (room === HOME_WIDGET_ROOM ? 'lunar' : 'default');
  const isLunar = visualVariant === 'lunar';
  const surface = getThemeSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const textPrimaryStyle = tintSurface.textPrimaryColor
    ? { color: tintSurface.textPrimaryColor }
    : undefined;
  const textSecondaryStyle = tintSurface.textSecondaryColor
    ? { color: tintSurface.textSecondaryColor }
    : undefined;
  const textSecondaryClassName = tintSurface.textSecondaryColor ? '' : surface.textSecondary;
  const textMutedClassName = tintSurface.textSecondaryColor ? '' : surface.textMuted;
  const rooms = useAreaRooms();
  const batteries = useProviderBatterySensorRows();
  const selectedEntityIds = getSelectedEntityIds(data?.selectedEntityIds);
  const selectedIdSet = useMemo(() => new Set(selectedEntityIds ?? []), [selectedEntityIds]);
  const filteredBatteries = useMemo(
    () =>
      selectedEntityIds === undefined
        ? batteries
        : batteries.filter((battery) => selectedIdSet.has(battery.id)),
    [batteries, selectedEntityIds, selectedIdSet]
  );
  const batteryModel = useMemo(
    () => buildBatteryOverviewModel(filteredBatteries),
    [filteredBatteries]
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chromeSize = size === 'large' ? 'medium' : size;
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);

  const isCompact = isCompactCardSize(size);
  const accentHex = getThemeColorValue(primaryColor);
  const subtleFill =
    tintSurface.subtleFill ??
    (theme === 'light'
      ? '#f3f4f6'
      : theme === 'black'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.08)');

  useEffect(() => {
    if (!isEditMode) {
      setIsSettingsOpen(false);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) {
      setIsSettingsOpen(true);
    }
  }, [onUpdate, openSettingsRequestKey]);

  const handleSelectionChange = (nextSelectedEntityIds: string[]) => {
    onUpdate?.({ selectedEntityIds: nextSelectedEntityIds });
  };

  const emptyStateLabel =
    batteries.length === 0
      ? t('widgets.battery.noBatteries')
      : selectedEntityIds !== undefined
        ? t('widgets.battery.noSelectedBatteries')
        : t('widgets.battery.noBatteries');
  const emptyStateDescription =
    batteries.length === 0
      ? t('widgets.battery.settings.noneAvailable')
      : t('widgets.battery.settings.help');
  const isEmpty = filteredBatteries.length === 0;
  const canOpenSettingsFromCard = Boolean(onUpdate) && !isEmpty;
  const openSettings = () => setIsSettingsOpen(true);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSettings();
    }
  };
  const isZh = language.toLowerCase().startsWith('zh');
  const lowCount = batteryModel.criticalCount + batteryModel.lowCount;
  const highHighlightId = batteryModel.rows.find((row) => row.level >= 80)?.id;
  const lunarEmptyTitle = isZh
    ? batteries.length > 0 && selectedEntityIds !== undefined
      ? '未选择电池设备'
      : '未检测到电池设备'
    : emptyStateLabel;
  const lunarEmptyDescription = isZh
    ? batteries.length > 0 && selectedEntityIds !== undefined
      ? '在设置中选择要显示的电池。'
      : '连接后将显示设备电量。'
    : emptyStateDescription;
  const displayedBatteries = isLunar
    ? size === 'small'
      ? batteryModel.lowest
        ? [batteryModel.lowest]
        : []
      : size === 'medium'
        ? batteryModel.rows.slice(0, 5)
        : batteryModel.rows
    : filteredBatteries;

  return (
    <div className="h-full">
      <BaseCard
        size={size}
        role={canOpenSettingsFromCard ? 'button' : undefined}
        tabIndex={canOpenSettingsFromCard ? 0 : undefined}
        aria-label={
          canOpenSettingsFromCard
            ? t('entityCardInteraction.openSettings', { name: t('widgets.battery.title') })
            : undefined
        }
        onClick={canOpenSettingsFromCard ? openSettings : undefined}
        onKeyDown={canOpenSettingsFromCard ? handleCardKeyDown : undefined}
        interactive={canOpenSettingsFromCard}
        fullBleed
        className={`${isLunar ? 'battery-lunar-card' : ''} transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-500`}
        style={
          isLunar
            ? { background: 'linear-gradient(145deg, #050816 0%, #081126 58%, #0d1832 100%)' }
            : tintSurface.panelStyle
        }
        readableBackgroundColor={isLunar ? '#050816' : tintSurface.backgroundColor}
        themeOverride={isLunar ? 'dark' : undefined}
        frameClassName="overflow-hidden"
        innerClassName={isLunar ? 'z-[1]' : undefined}
        disableDefaultSheen={isLunar}
        data-battery-variant={visualVariant}
        data-battery-size={size}
        data-battery-motion={isLunar ? motion : undefined}
        overlay={
          isLunar ? (
            <div className="battery-lunar-atmosphere" data-battery-atmosphere="true" />
          ) : (
            <>
              {tintSurface.glowStyle ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  data-dashboard-glow="true"
                  style={tintSurface.glowStyle}
                />
              ) : null}
              {tintSurface.overlayClassName ? (
                <div
                  className={`pointer-events-none absolute inset-0 ${tintSurface.overlayClassName}`}
                />
              ) : null}
            </>
          )
        }
        contentClassName="h-full"
      >
        <div className="relative flex h-full min-w-0 flex-col p-3">
          {isEmpty ? (
            isLunar ? (
              <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-2 text-center">
                <EntityCardHeaderIcon
                  IconComponent={Battery}
                  isActive={false}
                  size={size}
                  themeOverride="dark"
                  baseColor="#83d8d0"
                />
                <div>
                  <h3 className="text-xs font-semibold text-white/92">{lunarEmptyTitle}</h3>
                  <p className="mt-0.5 text-[11px] text-blue-100/48">{lunarEmptyDescription}</p>
                </div>
                {onUpdate ? (
                  <button
                    type="button"
                    className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-blue-50/78 transition-colors hover:bg-white/[0.08]"
                    onClick={(event) => {
                      event.stopPropagation();
                      openSettings();
                    }}
                  >
                    {t('widgets.battery.settings.title')}
                  </button>
                ) : null}
              </div>
            ) : (
              <CardEmptyState
                title={emptyStateLabel}
                description={emptyStateDescription}
                icon={Battery}
                actionLabel={onUpdate ? t('widgets.battery.settings.title') : undefined}
                onAction={onUpdate ? openSettings : undefined}
                actionIcon={onUpdate ? Settings2 : undefined}
                size={size}
                accentColor={tintColor ?? accentHex}
              />
            )
          ) : (
            <>
              {isLunar ? (
                <EntityCardHeader
                  title={t('widgets.battery.title')}
                  subtitle="POWER / CELLS"
                  layout="eyebrow-first"
                  size={chromeSize}
                  titleClassName="text-white/92"
                  subtitleClassName="text-blue-100/52"
                  titleStyle={{ color: 'rgba(245, 248, 255, 0.92)' }}
                  subtitleStyle={{ color: 'rgba(210, 220, 242, 0.52)' }}
                  backgroundColor="#050816"
                  leading={
                    <EntityCardHeaderIcon
                      IconComponent={Battery}
                      isActive
                      size={chromeSize}
                      themeOverride="dark"
                      baseColor="#83d8d0"
                    />
                  }
                />
              ) : (
                <EntityCardHeader
                  title={t('widgets.battery.title')}
                  subtitle={t('widgets.common.widget')}
                  layout="eyebrow-first"
                  size={chromeSize}
                  titleClassName={tintSurface.textPrimaryColor ? '' : surface.textPrimary}
                  subtitleClassName={textMutedClassName}
                  backgroundColor={tintSurface.backgroundColor}
                  titleStyle={textPrimaryStyle}
                  subtitleStyle={textSecondaryStyle}
                  leading={
                    <EntityCardHeaderIcon IconComponent={Battery} isActive size={chromeSize} />
                  }
                />
              )}
              {isLunar ? (
                <div className="battery-lunar-summary">
                  <div className="min-w-0">
                    <div className="battery-lunar-summary-count">
                      {batteryModel.totalCount}
                      <span>
                        {isZh ? '个电池' : batteryModel.totalCount === 1 ? 'cell' : 'cells'}
                      </span>
                    </div>
                    <div className="battery-lunar-summary-status" data-has-low={lowCount > 0}>
                      {lowCount > 0
                        ? isZh
                          ? `${lowCount} 个低电量`
                          : `${lowCount} low`
                        : isZh
                          ? '0 个低电量'
                          : '0 low'}
                    </div>
                  </div>
                  {batteryModel.averageLevel !== undefined ? (
                    <div
                      className="battery-lunar-core"
                      role="img"
                      aria-label={
                        isZh
                          ? `平均电量 ${batteryModel.averageLevel}%`
                          : `Average battery ${batteryModel.averageLevel}%`
                      }
                      style={
                        { '--battery-average': `${batteryModel.averageLevel}%` } as CSSProperties
                      }
                    >
                      <span className="battery-lunar-core-value">{batteryModel.averageLevel}%</span>
                      <span className="battery-lunar-core-label">AVG</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <BatteryList
                devices={displayedBatteries}
                isCompact={isCompact}
                subtleFill={isLunar ? 'rgba(255,255,255,0.08)' : subtleFill}
                textSecondary={isLunar ? 'text-blue-100/68' : textSecondaryClassName}
                emptyStateLabel={isLunar ? lunarEmptyTitle : emptyStateLabel}
                getLevelColor={(level) =>
                  isLunar ? getLunarLevelColor(level) : getLevelColor(level, accentHex)
                }
                variant={visualVariant}
                highlightId={highHighlightId}
              />
            </>
          )}
        </div>
      </BaseCard>
      {isSettingsOpen ? (
        <Suspense fallback={null}>
          <BatterySettingsDialog
            batteries={batteries}
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            selectedEntityIds={selectedEntityIds}
            onSelectionChange={handleSelectionChange}
            roomValue={roomValue}
            roomLabel={roomLabel}
            roomOptions={roomOptions}
            onRoomChange={onRoomChange}
            tintColor={tintColor}
            onTintColorChange={(nextTintColor) =>
              onUpdate?.({ ...(data ?? {}), tintColor: nextTintColor })
            }
          />
        </Suspense>
      ) : null}
    </div>
  );
});
