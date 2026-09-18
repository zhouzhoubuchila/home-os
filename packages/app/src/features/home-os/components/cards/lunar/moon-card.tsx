import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Moon, Sunrise, Sunset } from 'lucide-react';
import type { ReactNode } from 'react';
import { UPSTREAM_LUNAR_PHASE_CARD_COMMIT } from './moon-assets';
import type { MoonCardModel } from './moon-card-model';
import { getMoonPhaseName } from './moon-card-model';

function formatTime(value: Date | undefined, language: string) {
  return (
    value?.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }) ?? '—'
  );
}

function formatDaylight(model: MoonCardModel, language: string) {
  if (!model.daylightDurationMs) return '—';
  const hours = Math.floor(model.daylightDurationMs / 3_600_000);
  const minutes = Math.round((model.daylightDurationMs % 3_600_000) / 60_000);
  return language === 'zh' ? `${hours} 小时 ${minutes} 分` : `${hours}h ${minutes}m`;
}

function formatDegrees(value: number | undefined) {
  return value === undefined ? '—' : `${value.toFixed(1)}°`;
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-current/10 py-1.5 last:border-b-0 last:pb-0">
      <span className="truncate text-current/55">{label}</span>
      <strong className="shrink-0 tabular-nums">{value}</strong>
    </div>
  );
}

/**
 * React adaptation of lunar-phase-card's `moon-image` component.
 * The image selection and grayscale/drop-shadow treatment intentionally follow
 * the upstream card; Lit lifecycle and Home Assistant properties are removed.
 */
export function MoonPhaseVisual({
  model,
  language,
  className = '',
}: {
  model: MoonCardModel;
  language: string;
  className?: string;
}) {
  const name = getMoonPhaseName(model.phaseKey, language);
  const label =
    language === 'zh'
      ? `${name}，照明 ${model.illuminationPercent}%`
      : `${name}, ${model.illuminationPercent}% illuminated`;

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-square shrink-0 select-none ${className}`}
      data-moon-phase={model.phaseKey}
      data-moon-direction={model.phase < 0.5 ? 'waxing' : 'waning'}
      data-upstream-moon-image="true"
      data-upstream-phase-index={model.phaseImageIndex}
      data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
    >
      <img
        src={model.moonImageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full object-contain grayscale brightness-95 drop-shadow-[2px_2px_6px_rgb(255_255_255/0.2)]"
      />
    </div>
  );
}

function getSourceLabel(source: MoonCardModel['source'], language: string) {
  return source === 'entity'
    ? language === 'zh'
      ? '实体数据'
      : 'Entity data'
    : language === 'zh'
      ? '本地计算'
      : 'Locally calculated';
}

function SourceLabel({ source, language }: Pick<MoonCardModel, 'source'> & { language: string }) {
  return getSourceLabel(source, language);
}

export function MoonCard({
  size,
  model,
  language,
  theme,
}: {
  size: CardSize;
  model: MoonCardModel;
  language: string;
  theme?: ThemeType;
}) {
  const { theme: activeTheme } = useTheme();
  const surface = getThemeSurfaceTokens(theme ?? activeTheme);
  const small = size === 'small' || size === 'tiny' || size === 'extra-small';
  const large = size === 'large' || size === 'extra-large' || size === 'extra-wide';
  const phaseName = getMoonPhaseName(model.phaseKey, language);
  const sourceLabel = getSourceLabel(model.source, language);
  const labels =
    language === 'zh'
      ? {
          card: '月相',
          illumination: '照明',
          age: '月龄',
          rise: '日出',
          set: '日落',
          daylight: '昼长',
          next: '下一事件',
          azimuth: '方位',
          altitude: '高度',
        }
      : {
          card: 'Moon phase',
          illumination: 'Illumination',
          age: 'Moon age',
          rise: 'Rise',
          set: 'Set',
          daylight: 'Daylight',
          next: 'Next event',
          azimuth: 'Azimuth',
          altitude: 'Altitude',
        };

  return (
    <BaseCard
      size={size}
      fullBleed
      themeOverride={theme}
      frameClassName="overflow-hidden"
      contentClassName="h-full"
      disableDefaultSheen
      underlay={
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: model.isDay
              ? 'radial-gradient(circle at 24% 38%, rgb(251 191 36 / 0.08), transparent 42%)'
              : 'radial-gradient(circle at 24% 38%, rgb(148 163 184 / 0.08), transparent 42%)',
          }}
        />
      }
    >
      <div
        className={`relative flex h-full min-h-0 flex-col ${small ? 'p-3' : 'p-4'}`}
        data-home-os-moon-card="upstream-adapted"
        data-moon-source={model.source}
        data-is-day={model.isDay ? 'true' : 'false'}
        data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
        title={sourceLabel}
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Moon className={`${small ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-current/55`} />
            <span className="truncate text-[0.68rem] font-semibold tracking-wide text-current/55">
              {labels.card}
            </span>
          </div>
          {!small ? (
            <span className="rounded-full border border-current/10 px-2 py-0.5 text-[0.62rem] text-current/45">
              {sourceLabel}
            </span>
          ) : null}
        </header>

        {small ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1">
            <MoonPhaseVisual model={model} language={language} className="h-16 w-16" />
            <p className="max-w-full truncate text-sm font-semibold tracking-tight">{phaseName}</p>
            <p className={`text-xs tabular-nums ${surface.textMuted}`}>
              {labels.illumination} {model.illuminationPercent}%
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center gap-3 overflow-hidden">
            <MoonPhaseVisual
              model={model}
              language={language}
              className={`${large ? 'h-32 w-32' : 'h-24 w-24'} w-[36%] max-w-[150px] min-w-[88px]`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold tracking-tight">{phaseName}</p>
              <p className="mt-1 text-2xl font-light tabular-nums">
                {model.illuminationPercent}%
                <span className={`ml-1 text-xs font-normal ${surface.textMuted}`}>
                  {labels.illumination}
                </span>
              </p>
              <p className={`mt-1 text-xs ${surface.textMuted}`}>
                {labels.age} {model.ageDays.toFixed(1)} {language === 'zh' ? '天' : 'days'}
              </p>
              {large ? (
                <div className={`mt-2 grid grid-cols-2 gap-x-3 text-xs ${surface.textMuted}`}>
                  <span>
                    {labels.azimuth}{' '}
                    <strong className="text-current">{formatDegrees(model.azimuth)}</strong>
                  </span>
                  <span>
                    {labels.altitude}{' '}
                    <strong className="text-current">{formatDegrees(model.altitude)}</strong>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {!small ? (
          <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 border-t border-current/10 pt-2 text-xs">
            <DataRow
              label={labels.rise}
              value={
                <span className="flex items-center gap-1">
                  <Sunrise className="h-3.5 w-3.5 text-amber-300/70" />
                  {formatTime(model.sunrise, language)}
                </span>
              }
            />
            <DataRow
              label={labels.set}
              value={
                <span className="flex items-center gap-1">
                  <Sunset className="h-3.5 w-3.5 text-orange-300/70" />
                  {formatTime(model.sunset, language)}
                </span>
              }
            />
            {large ? (
              <>
                <DataRow label={labels.daylight} value={formatDaylight(model, language)} />
                <DataRow label={labels.next} value={formatTime(model.nextEvent, language)} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </BaseCard>
  );
}

export function MoonCardDetail({ model, language }: { model: MoonCardModel; language: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const labels =
    language === 'zh'
      ? {
          illumination: '照明',
          age: '月龄',
          rise: '日出',
          set: '日落',
          daylight: '昼长',
          azimuth: '方位',
          altitude: '高度',
          next: '下一事件',
        }
      : {
          illumination: 'Illumination',
          age: 'Moon age',
          rise: 'Rise',
          set: 'Set',
          daylight: 'Daylight',
          azimuth: 'Azimuth',
          altitude: 'Altitude',
          next: 'Next event',
        };
  const phaseName = getMoonPhaseName(model.phaseKey, language);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-current/10 p-4"
      data-home-os-moon-detail="upstream-adapted"
      data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
    >
      <div className="flex items-center gap-4">
        <MoonPhaseVisual model={model} language={language} className="h-36 w-36" />
        <div className="min-w-0">
          <p className="text-xl font-semibold">{phaseName}</p>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>
            {labels.illumination}: {model.illuminationPercent}%
          </p>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>
            {labels.age}: {model.ageDays.toFixed(1)} {language === 'zh' ? '天' : 'days'}
          </p>
          <p className={`mt-2 text-xs ${surface.textMuted}`}>
            <SourceLabel source={model.source} language={language} />
          </p>
        </div>
      </div>
      <div className={`mt-4 grid grid-cols-2 gap-x-5 text-sm ${surface.textSecondary}`}>
        <DataRow label={labels.rise} value={formatTime(model.sunrise, language)} />
        <DataRow label={labels.set} value={formatTime(model.sunset, language)} />
        <DataRow label={labels.azimuth} value={formatDegrees(model.azimuth)} />
        <DataRow label={labels.altitude} value={formatDegrees(model.altitude)} />
        <DataRow label={labels.daylight} value={formatDaylight(model, language)} />
        <DataRow label={labels.next} value={formatTime(model.nextEvent, language)} />
      </div>
    </section>
  );
}
