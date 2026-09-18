import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { Moon, Sunrise, Sunset } from 'lucide-react';
import type { MoonCardModel } from './moon-card-model';
import { getMoonPhaseName } from './moon-card-model';

function illuminationPath(phase: number, radius = 46) {
  const normalized = ((phase % 1) + 1) % 1;
  const waxing = normalized < 0.5;
  const cosine = Math.cos(normalized * Math.PI * 2);
  const ys = Array.from({ length: 33 }, (_, index) => -radius + (index / 32) * radius * 2);
  const boundary = (y: number) => Math.sqrt(Math.max(0, radius * radius - y * y));
  const left = ys.map((y) => {
    const edge = boundary(y);
    return [waxing ? cosine * edge : -edge, y] as const;
  });
  const right = [...ys].reverse().map((y) => {
    const edge = boundary(y);
    return [waxing ? edge : -cosine * edge, y] as const;
  });
  return [...left, ...right]
    .map(([x, y], index) => `${index ? 'L' : 'M'} ${(x + 50).toFixed(2)} ${(y + 50).toFixed(2)}`)
    .join(' ')
    .concat(' Z');
}

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
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      className={className}
      data-moon-phase={model.phaseKey}
      data-moon-direction={model.phase < 0.5 ? 'waxing' : 'waning'}
    >
      <defs>
        <radialGradient id="moon-v2-disc" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="58%" stopColor="#e7e5df" />
          <stop offset="100%" stopColor="#aaa8a1" />
        </radialGradient>
        <filter id="moon-v2-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="moon-v2-clip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill="rgb(15 18 24)" stroke="rgb(255 255 255 / 0.12)" />
      <path
        d={illuminationPath(model.phase)}
        fill="url(#moon-v2-disc)"
        filter="url(#moon-v2-glow)"
        clipPath="url(#moon-v2-clip)"
      />
      <g clipPath="url(#moon-v2-clip)" fill="rgb(30 32 36 / 0.12)">
        <circle cx="37" cy="31" r="5" />
        <circle cx="64" cy="57" r="7" />
        <circle cx="43" cy="70" r="3" />
      </g>
    </svg>
  );
}

const time = (value: Date | undefined, language: string) =>
  value?.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }) ?? '—';

function daylight(model: MoonCardModel, language: string) {
  if (!model.daylightDurationMs) return '—';
  const hours = Math.floor(model.daylightDurationMs / 3_600_000);
  const minutes = Math.round((model.daylightDurationMs % 3_600_000) / 60_000);
  return language === 'zh' ? `${hours} 小时 ${minutes} 分` : `${hours}h ${minutes}m`;
}

export function MoonCard({
  size,
  model,
  language,
}: {
  size: CardSize;
  model: MoonCardModel;
  language: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const small = size === 'small' || size === 'tiny' || size === 'extra-small';
  const large = size === 'large' || size === 'extra-large' || size === 'extra-wide';
  const phaseName = getMoonPhaseName(model.phaseKey, language);
  const sourceLabel =
    model.source === 'entity'
      ? language === 'zh'
        ? '实体数据'
        : 'Entity data'
      : language === 'zh'
        ? '本地计算'
        : 'Locally calculated';

  return (
    <BaseCard
      size={size}
      fullBleed
      frameClassName="overflow-hidden"
      contentClassName="h-full"
      disableDefaultSheen
      underlay={
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background: model.isDay
              ? 'radial-gradient(circle at 32% 42%, rgb(251 191 36 / 0.08), transparent 42%)'
              : 'radial-gradient(circle at 32% 42%, rgb(226 232 240 / 0.10), transparent 42%)',
          }}
        />
      }
    >
      <div
        className={`relative flex h-full min-h-0 flex-col ${small ? 'p-3' : 'p-4'}`}
        data-home-os-moon-card="v2"
        data-moon-source={model.source}
        data-is-day={model.isDay ? 'true' : 'false'}
        title={sourceLabel}
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Moon className={`${small ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-current/55`} />
            <span className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-current/55">
              {language === 'zh' ? '月相' : 'Moon'}
            </span>
          </div>
          {!small ? (
            <span className="rounded-full border border-current/10 px-2 py-0.5 text-[0.62rem] text-current/45">
              {sourceLabel}
            </span>
          ) : null}
        </header>

        <div
          className={`flex min-h-0 flex-1 items-center ${small ? 'flex-col justify-center gap-1' : 'gap-4'}`}
        >
          <MoonPhaseVisual
            model={model}
            language={language}
            className={
              small ? 'h-14 w-14 shrink-0' : large ? 'h-28 w-28 shrink-0' : 'h-20 w-20 shrink-0'
            }
          />
          <div className={small ? 'text-center' : 'min-w-0 flex-1'}>
            <p className={`${small ? 'text-sm' : 'text-xl'} truncate font-semibold tracking-tight`}>
              {phaseName}
            </p>
            <p className={`${small ? 'text-xs' : 'mt-1 text-2xl'} font-light tabular-nums`}>
              {small
                ? `${model.illuminationPercent}%`
                : language === 'zh'
                  ? `照明 ${model.illuminationPercent}%`
                  : `${model.illuminationPercent}% illuminated`}
            </p>
            {!small ? (
              <p className={`mt-1 text-xs ${surface.textMuted}`}>
                {language === 'zh'
                  ? `月龄 ${model.ageDays.toFixed(1)} 天`
                  : `Moon age ${model.ageDays.toFixed(1)} days`}
              </p>
            ) : null}
          </div>
        </div>

        {!small ? (
          <footer className="grid grid-cols-2 gap-2 border-t border-current/10 pt-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Sunrise className="h-3.5 w-3.5 text-amber-300/70" />
              <span className={surface.textMuted}>{language === 'zh' ? '日出' : 'Rise'}</span>
              <strong className="ml-auto tabular-nums">{time(model.sunrise, language)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Sunset className="h-3.5 w-3.5 text-orange-300/70" />
              <span className={surface.textMuted}>{language === 'zh' ? '日落' : 'Set'}</span>
              <strong className="ml-auto tabular-nums">{time(model.sunset, language)}</strong>
            </span>
            {large ? (
              <div
                className={`col-span-2 flex justify-between text-[0.68rem] ${surface.textMuted}`}
              >
                <span>
                  {language === 'zh' ? '昼长' : 'Daylight'} · {daylight(model, language)}
                </span>
                <span>
                  {model.nextEventKind === 'sunrise'
                    ? language === 'zh'
                      ? '下一次日出'
                      : 'Next sunrise'
                    : language === 'zh'
                      ? '下一次日落'
                      : 'Next sunset'}{' '}
                  · {time(model.nextEvent, language)}
                </span>
              </div>
            ) : null}
          </footer>
        ) : null}
      </div>
    </BaseCard>
  );
}
