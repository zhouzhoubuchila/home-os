import { cn } from '@navet/app/components/ui/utils';
import { useI18n, type useTheme } from '@navet/app/hooks';
import { memo } from 'react';
import {
  getCompactVisualClassName,
  type MotionLevel,
  resolveVacuumIllustrationSurface,
  SharedVacuumCardShell,
  useVacuumCardState,
  type VacuumCardProps,
  type VacuumDisplayState,
} from './vacuum-card.shared';

function VacuumSideBrush({
  subtitleColor,
  compact = false,
}: {
  subtitleColor: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-0 vacuum-lunar-side-brush',
        compact
          ? 'top-[0.72rem] right-[0.02rem] h-[1.05rem] w-[1.05rem]'
          : 'top-[0.72rem] right-[0.02rem] h-[1.2rem] w-[1.2rem]'
      )}
      aria-hidden="true"
      data-testid="vacuum-side-brush"
    >
      <span
        className="absolute left-1/2 top-1/2 h-[1px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: subtitleColor, opacity: 0.9 }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[1px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full rotate-60"
        style={{ backgroundColor: subtitleColor, opacity: 0.72 }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[1px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full -rotate-60"
        style={{ backgroundColor: subtitleColor, opacity: 0.72 }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-zinc-950/90"
        style={{ borderColor: subtitleColor, opacity: 0.9 }}
      />
    </div>
  );
}

function VacuumRobotVisual({
  displayState,
  motionLevel,
  theme,
  titleColor,
  subtitleColor,
  variant = 'compact',
  className,
}: {
  displayState: VacuumDisplayState;
  motionLevel: MotionLevel;
  theme: ReturnType<typeof useTheme>['theme'];
  titleColor: string;
  subtitleColor: string;
  variant?: 'compact' | 'detail';
  className?: string;
}) {
  const { t } = useI18n();
  const isCleaning = displayState === 'cleaning' || displayState === 'mopping';
  const isReturning = displayState === 'returning';
  const isCharging =
    displayState === 'charging' ||
    displayState === 'charging-complete' ||
    displayState === 'docked';
  const isPaused = displayState === 'paused';
  const isUnavailable = displayState === 'unavailable';
  const isCompact = variant === 'compact';
  const showPulse = motionLevel !== 'low' && isCharging;
  const showSweep = motionLevel !== 'low' && isCleaning;
  const robotSurface = resolveVacuumIllustrationSurface({
    theme,
    displayState,
    titleColor,
  });
  const dockStrokeColor = subtitleColor;
  const dockStrokeOpacity = 0.58;
  const dockRailOpacity = 0.2;
  const dockBaseOpacity = 0.42;
  const pulseRingBorderColor = 'rgba(125,211,252,0.18)';
  const visualContainerClassName = isCompact
    ? 'relative flex h-full min-h-[8rem] items-center justify-center overflow-visible'
    : 'relative flex h-full min-h-[8rem] items-center justify-center overflow-hidden';

  return (
    <div className={cn(visualContainerClassName, className)}>
      <div
        className={cn(
          'vacuum-lunar-dock absolute right-2 -top-4 h-5 w-16 transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-700',
          isCharging || isReturning ? 'opacity-100' : 'opacity-60'
        )}
        aria-hidden="true"
      >
        {!isCompact ? (
          <div
            className="absolute inset-x-1 top-0 h-2 rounded-full border"
            style={{ borderColor: dockStrokeColor, opacity: dockStrokeOpacity }}
          />
        ) : null}
        <div
          className="absolute left-1 top-1 h-3 w-[1px]"
          style={{ backgroundColor: dockStrokeColor, opacity: dockRailOpacity }}
        />
        <div
          className="absolute right-1 top-1 h-3 w-[1px]"
          style={{ backgroundColor: dockStrokeColor, opacity: dockRailOpacity }}
        />
        {!isCompact ? (
          <div
            className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
            style={{ backgroundColor: dockStrokeColor, opacity: dockBaseOpacity }}
          />
        ) : null}
      </div>
      {showPulse ? (
        <div
          className="absolute h-24 w-24 rounded-full border vacuum-lunar-charge-ring"
          style={{ borderColor: pulseRingBorderColor }}
        />
      ) : null}
      {isCompact ? (
        <div className="relative z-[1] h-[4.9rem] w-[4.9rem]">
          {isCleaning ? <VacuumSideBrush subtitleColor={subtitleColor} compact /> : null}
          <div
            className={cn(
              'relative z-[1] flex h-[4.9rem] w-[4.9rem] items-center justify-center rounded-full border transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-700',
              isUnavailable && 'opacity-45 grayscale-[0.25]',
              isPaused && 'scale-[0.98]',
              displayState === 'error' && 'ring-1 ring-rose-400/30'
            )}
            style={{
              borderColor: titleColor,
              background: robotSurface.background,
              backgroundColor: robotSurface.baseColor,
              boxShadow: robotSurface.shadow,
            }}
            data-testid="vacuum-robot-surface"
          >
            {showSweep ? (
              <div
                className="absolute inset-[0.32rem] rounded-full opacity-50"
                style={{
                  background: `conic-gradient(from 210deg, transparent 0deg, transparent 240deg, ${subtitleColor}24 275deg, transparent 320deg)`,
                }}
              />
            ) : null}
            <div
              className="absolute top-[0.88rem] h-[0.5rem] w-[0.5rem] rounded-full border"
              style={{
                borderColor: subtitleColor,
                backgroundColor: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(0,0,0,0.15)',
              }}
            />
            <div
              className="absolute bottom-[0.72rem] left-1/2 h-[0.28rem] w-[2.6rem] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: subtitleColor, opacity: 0.55 }}
            />
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-semibold"
              style={{ borderColor: subtitleColor, color: titleColor }}
            >
              N
            </div>
          </div>
        </div>
      ) : null}
      {!isCompact ? (
        <div className="relative">
          {isCleaning ? <VacuumSideBrush subtitleColor={subtitleColor} /> : null}
          <div
            className={cn(
              'relative z-[1] flex h-[4.9rem] w-[4.9rem] items-center justify-center rounded-full border transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] duration-700',
              isUnavailable && 'opacity-45 grayscale-[0.25]',
              isPaused && 'scale-[0.98]',
              displayState === 'error' && 'ring-1 ring-rose-400/30'
            )}
            style={{
              borderColor: titleColor,
              background: robotSurface.background,
              backgroundColor: robotSurface.baseColor,
              boxShadow: robotSurface.shadow,
            }}
            data-testid="vacuum-robot-surface"
          >
            {showSweep ? (
              <div
                className="absolute inset-[0.32rem] rounded-full opacity-70"
                style={{
                  background: `conic-gradient(from 210deg, transparent 0deg, transparent 228deg, ${titleColor}18 270deg, transparent 318deg, transparent 360deg)`,
                }}
              />
            ) : null}
            <div
              className="absolute top-[0.88rem] h-[0.5rem] w-[0.5rem] rounded-full border"
              style={{
                borderColor: subtitleColor,
                backgroundColor: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(0,0,0,0.15)',
              }}
            />
            <div
              className="absolute bottom-[0.72rem] left-1/2 h-[0.28rem] w-[2.6rem] -translate-x-1/2 rounded-full"
              style={{ backgroundColor: subtitleColor, opacity: 0.55 }}
            />
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-semibold"
              style={{ borderColor: subtitleColor, color: titleColor }}
            >
              N
            </div>
            {isPaused ? (
              <div
                className="absolute inset-x-0 -bottom-5 text-center text-[10px]"
                style={{ color: subtitleColor }}
              >
                {t('vacuum.status.paused')}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const VacuumCard = memo(function VacuumCard(props: VacuumCardProps) {
  const state = useVacuumCardState(props, { entityVariant: 'vacuum' });

  return (
    <SharedVacuumCardShell
      state={state}
      compactVisual={
        <VacuumRobotVisual
          displayState={state.displayState}
          motionLevel={state.motionLevel}
          theme={state.theme}
          titleColor={state.illustrationPalette.titleColor}
          subtitleColor={state.illustrationPalette.subtitleColor}
          variant={
            state.resolvedSize === 'large' || state.resolvedSize === 'extra-large'
              ? 'detail'
              : 'compact'
          }
          className={getCompactVisualClassName(state.resolvedSize)}
        />
      }
    />
  );
});
