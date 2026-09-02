import type { ResolvedSemanticEntity } from '../core/types';
import { getMoonPhase, getMoonPhaseFromEntity } from './moon-phase';

const readDate = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
};

const readNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export interface AstronomySnapshot {
  moon: ReturnType<typeof getMoonPhase>;
  moonSource: 'entity' | 'algorithm';
  sunSource: 'home_assistant' | 'unavailable';
  sunrise?: Date;
  sunset?: Date;
  nextEvent?: Date;
  daylightProgress?: number;
  isDay: boolean;
  elevation?: number;
  azimuth?: number;
}

export function getAstronomySnapshot(
  entities: readonly ResolvedSemanticEntity[],
  now = new Date()
): AstronomySnapshot {
  const sun = entities.find((item) => item.entity.externalId === 'sun.sun')?.entity;
  const moonEntity = entities.find((item) =>
    ['moon.phase', 'sensor.moon_phase', 'sensor.moon'].includes(item.entity.externalId)
  )?.entity;
  const entityMoon = getMoonPhaseFromEntity(moonEntity?.primaryState);
  const sunrise = readDate(sun?.attributes.nextRising ?? sun?.attributes.next_rising);
  const sunset = readDate(sun?.attributes.nextSetting ?? sun?.attributes.next_setting);
  const elevation = readNumber(sun?.attributes.elevation);
  const azimuth = readNumber(sun?.attributes.azimuth);
  const isDay = String(sun?.primaryState).toLowerCase() === 'above_horizon';
  // Adapted from Sun Position Card's MIT-licensed elapsed-day arc: Home Assistant exposes
  // the next sunrise, so during daylight it belongs to tomorrow and must be shifted back.
  const effectiveSunrise =
    sunrise && sunrise > now ? new Date(sunrise.getTime() - 86_400_000) : sunrise;
  const daylightProgress =
    sun && isDay && effectiveSunrise && sunset && sunset > effectiveSunrise
      ? Math.max(
          0,
          Math.min(
            1,
            (now.getTime() - effectiveSunrise.getTime()) /
              (sunset.getTime() - effectiveSunrise.getTime())
          )
        )
      : undefined;
  return {
    moon: entityMoon ?? getMoonPhase(now),
    moonSource: entityMoon ? 'entity' : 'algorithm',
    sunSource: sun ? 'home_assistant' : 'unavailable',
    sunrise,
    sunset,
    nextEvent: [sunrise, sunset]
      .filter((value): value is Date => Boolean(value && value.getTime() > now.getTime()))
      .sort((left, right) => left.getTime() - right.getTime())[0],
    daylightProgress,
    isDay,
    elevation,
    azimuth,
  };
}

export function AstronomyVisual({
  entities,
  language,
  now = new Date(),
  compact = false,
}: {
  entities: readonly ResolvedSemanticEntity[];
  language: string;
  now?: Date;
  compact?: boolean;
}) {
  const snapshot = getAstronomySnapshot(entities, now);
  const sunX =
    snapshot.daylightProgress === undefined ? undefined : 16 + snapshot.daylightProgress * 168;
  const sunY =
    snapshot.daylightProgress === undefined
      ? undefined
      : 82 - Math.sin(snapshot.daylightProgress * Math.PI) * 58;
  const moonOffset = (0.5 - snapshot.moon.illumination) * 27;
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const time = (value?: Date) =>
    value?.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) ?? '—';

  return (
    <div
      className="overflow-hidden rounded-2xl border border-current/10 p-3"
      style={{
        background: snapshot.isDay
          ? 'linear-gradient(135deg, rgb(56 189 248 / 0.25), rgb(252 211 77 / 0.1))'
          : 'linear-gradient(135deg, rgb(30 27 75 / 0.55), rgb(2 6 23 / 0.35))',
      }}
      data-astronomy-card="true"
      data-moon-phase={snapshot.moon.phase.toFixed(3)}
      data-sun-source={snapshot.sunSource}
      data-moon-source={snapshot.moonSource}
    >
      <svg
        viewBox="0 0 200 104"
        className={`${compact ? 'h-20' : 'h-28'} w-full`}
        role="img"
        aria-label={`${language === 'zh' ? snapshot.moon.name.zh : snapshot.moon.name.en}, ${Math.round(snapshot.moon.illumination * 100)}%`}
      >
        <title>
          {language === 'zh' ? '太阳轨迹与当前月相' : 'Sun path and current moon phase'}
        </title>
        <path d="M16 82 Q100 -8 184 82" fill="none" stroke="currentColor" opacity="0.2" />
        {sunX !== undefined && sunY !== undefined ? (
          <circle
            cx={sunX}
            cy={sunY}
            r="7"
            className="transition-all motion-reduce:transition-none"
            fill="#fcd34d"
          />
        ) : null}
        <g transform="translate(164 18)">
          <circle r="14" fill="#020617" stroke="rgb(255 255 255 / 0.3)" />
          <circle cx={moonOffset} r="13" fill="#f1f5f9" opacity="0.95" />
          <circle r="14" fill="none" stroke="rgb(255 255 255 / 0.4)" />
        </g>
        <text x="8" y="100" fill="currentColor" fontSize="9" opacity="0.65">
          {time(snapshot.sunrise)}
        </text>
        <text x="168" y="100" fill="currentColor" fontSize="9" opacity="0.65">
          {time(snapshot.sunset)}
        </text>
      </svg>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">
          {language === 'zh' ? snapshot.moon.name.zh : snapshot.moon.name.en}
        </span>
        <span className="tabular-nums text-current/60">
          {Math.round(snapshot.moon.illumination * 100)}% ·{' '}
          {snapshot.isDay ? (language === 'zh' ? '昼' : 'Day') : language === 'zh' ? '夜' : 'Night'}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-current/45">
        {language === 'zh'
          ? `太阳：${snapshot.sunSource === 'home_assistant' ? 'Home Assistant' : '无实时数据'} · 月相：${snapshot.moonSource === 'entity' ? '实体' : '算法估算'}`
          : `Sun: ${snapshot.sunSource === 'home_assistant' ? 'Home Assistant' : 'no live data'} · Moon: ${snapshot.moonSource}`}
      </div>
    </div>
  );
}
