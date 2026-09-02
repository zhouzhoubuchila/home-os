import type { ResolvedSemanticEntity } from '../core/types';
import { HomeOsHassFacade } from './home-os-hass-facade';
import { getMoonPhase, getMoonPhaseFromEntity } from './moon-phase';
import {
  calculateAstronomicalDaylightDuration,
  calculateDaylightDuration,
  calculateNightArcPosition,
  calculateSunArcPosition,
  resolveSunDaypart,
  type SunArcPoint,
  type SunDaypart,
} from './sun-position-card-adapter';

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
  daylightDurationMs?: number;
  sunArcPoint?: SunArcPoint;
  nightArcPoint?: SunArcPoint;
  daypart: SunDaypart;
  isDay: boolean;
  elevation?: number;
  azimuth?: number;
}

export function getAstronomySnapshot(
  entities: readonly ResolvedSemanticEntity[],
  now = new Date()
): AstronomySnapshot {
  const facade = new HomeOsHassFacade(entities);
  const sun = facade.getState('sun.sun');
  const moonEntity = entities.find((item) => {
    const entity = item.entity;
    const text = [
      entity.externalId,
      entity.name,
      entity.attributes.integration,
      entity.attributes.platform,
      entity.attributes.deviceClass,
      entity.attributes.device_class,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    return (
      entity.externalId.startsWith('moon.') ||
      /(?:^|[._ -])moon(?:$|[._ -])|moon phase|lunar phase|月相/.test(text) ||
      getMoonPhaseFromEntity(entity.primaryState) !== undefined
    );
  })?.entity;
  const entityMoon = getMoonPhaseFromEntity(moonEntity?.primaryState);
  const sunrise = readDate(
    facade.getState('sensor.sun_next_rising')?.state ??
      sun?.attributes.nextRising ??
      sun?.attributes.next_rising
  );
  const sunset = readDate(
    facade.getState('sensor.sun_next_setting')?.state ??
      sun?.attributes.nextSetting ??
      sun?.attributes.next_setting
  );
  const elevation = readNumber(sun?.attributes.elevation);
  const azimuth = readNumber(sun?.attributes.azimuth);
  const isDay = String(sun?.state).toLowerCase() === 'above_horizon' || (elevation ?? 0) > 0;
  const sunArcPoint =
    sunrise && sunset ? calculateSunArcPosition(now, sunrise, sunset, isDay) : undefined;
  const nightArcPoint =
    sunrise && sunset ? calculateNightArcPosition(now, sunrise, sunset, isDay) : undefined;
  return {
    moon: entityMoon ?? getMoonPhase(now),
    moonSource: entityMoon ? 'entity' : 'algorithm',
    sunSource: sun ? 'home_assistant' : 'unavailable',
    sunrise,
    sunset,
    nextEvent: [sunrise, sunset]
      .filter((value): value is Date => Boolean(value && value.getTime() > now.getTime()))
      .sort((left, right) => left.getTime() - right.getTime())[0],
    daylightProgress: sunArcPoint?.progress,
    daylightDurationMs:
      calculateDaylightDuration(sunrise, sunset) ??
      calculateAstronomicalDaylightDuration(
        now,
        readNumber(sun?.attributes.latitude ?? facade.getState('zone.home')?.attributes.latitude)
      ),
    sunArcPoint,
    nightArcPoint,
    daypart: resolveSunDaypart(azimuth, elevation),
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
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const time = (value?: Date) =>
    value?.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) ?? '—';
  const duration = snapshot.daylightDurationMs
    ? `${Math.floor(snapshot.daylightDurationMs / 3_600_000)}h ${Math.round((snapshot.daylightDurationMs % 3_600_000) / 60_000)}m`
    : '—';
  const phaseOffset = (0.5 - snapshot.moon.illumination) * 19;
  const movingBody = snapshot.isDay ? snapshot.sunArcPoint : snapshot.nightArcPoint;
  const daypartNames: Record<SunDaypart, { en: string; zh: string }> = {
    below_horizon: { en: 'Below horizon', zh: '地平线下' },
    dawn: { en: 'Dawn', zh: '黎明' },
    morning: { en: 'Morning', zh: '上午' },
    noon: { en: 'Noon', zh: '正午' },
    afternoon: { en: 'Afternoon', zh: '下午' },
    evening: { en: 'Evening', zh: '傍晚' },
    dusk: { en: 'Dusk', zh: '黄昏' },
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-current/10 p-3"
      style={{
        background: snapshot.isDay
          ? 'linear-gradient(155deg, rgb(14 165 233 / 0.26), rgb(251 191 36 / 0.12) 72%)'
          : 'linear-gradient(155deg, rgb(49 46 129 / 0.5), rgb(2 6 23 / 0.5) 72%)',
      }}
      data-astronomy-card="true"
      data-moon-phase={snapshot.moon.phase.toFixed(3)}
      data-sun-source={snapshot.sunSource}
      data-moon-source={snapshot.moonSource}
    >
      <svg
        viewBox="0 0 200 112"
        className={`${compact ? 'h-20' : 'h-32'} w-full`}
        role="img"
        aria-label={`${language === 'zh' ? snapshot.moon.name.zh : snapshot.moon.name.en}, ${Math.round(snapshot.moon.illumination * 100)}%`}
      >
        <title>
          {language === 'zh' ? '太阳轨迹与当前月相' : 'Sun path and current moon phase'}
        </title>
        <defs>
          <linearGradient id="home-os-horizon" x1="0" x2="1">
            <stop offset="0" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fb7185" stopOpacity="0.2" />
          </linearGradient>
          <mask id="home-os-moon-mask">
            <circle r="10" fill="white" />
            <circle cx={phaseOffset} r="10" fill="black" />
          </mask>
        </defs>
        <path
          d="M18 82 A82 58 0 0 1 182 82"
          fill="none"
          stroke="currentColor"
          strokeDasharray="3 5"
          opacity="0.32"
        />
        <path
          d="M18 82 A82 58 0 0 1 182 82"
          fill="none"
          stroke="url(#home-os-horizon)"
          strokeWidth="3"
          opacity="0.8"
        />
        <path
          d="M18 83 A82 30 0 0 0 182 83"
          fill="none"
          stroke="currentColor"
          strokeDasharray="2 6"
          opacity="0.15"
        />
        <line x1="10" x2="190" y1="83" y2="83" stroke="currentColor" opacity="0.16" />
        {movingBody ? (
          snapshot.isDay ? (
            <g
              className="transition-transform duration-500 motion-reduce:transition-none"
              transform={`translate(${movingBody.x} ${movingBody.y})`}
            >
              <circle r="12" fill="#fbbf24" opacity="0.16" />
              <g className="origin-center animate-[spin_40s_linear_infinite] motion-reduce:animate-none">
                {[0, 45, 90, 135].map((angle) => (
                  <line
                    key={angle}
                    x1="-10"
                    x2="10"
                    y1="0"
                    y2="0"
                    stroke="#fde68a"
                    strokeWidth="1.5"
                    transform={`rotate(${angle})`}
                  />
                ))}
              </g>
              <circle r="6.5" fill="#fcd34d" stroke="#fef3c7" strokeWidth="1" />
            </g>
          ) : (
            <g
              className="transition-transform duration-500 motion-reduce:transition-none"
              transform={`translate(${movingBody.x} ${movingBody.y})`}
            >
              <circle r="10" fill="#f8fafc" mask="url(#home-os-moon-mask)" />
              <circle r="10" fill="none" stroke="rgb(255 255 255 / 0.45)" />
            </g>
          )
        ) : null}
        {snapshot.isDay ? (
          <g transform="translate(171 20)">
            <circle r="10" fill="#f8fafc" mask="url(#home-os-moon-mask)" opacity="0.78" />
            <circle r="10" fill="none" stroke="rgb(255 255 255 / 0.35)" />
          </g>
        ) : null}
        <text x="8" y="101" fill="currentColor" fontSize="9" opacity="0.65">
          {time(snapshot.sunrise)}
        </text>
        <text x="166" y="101" fill="currentColor" fontSize="9" opacity="0.65">
          {time(snapshot.sunset)}
        </text>
      </svg>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">
          {language === 'zh' ? snapshot.moon.name.zh : snapshot.moon.name.en}
        </span>
        <span className="tabular-nums text-current/60">
          {language === 'zh'
            ? daypartNames[snapshot.daypart].zh
            : daypartNames[snapshot.daypart].en}
          {' · '}
          {Math.round(snapshot.moon.illumination * 100)}%
        </span>
      </div>
      {!compact ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-current/60">
          <span>
            {language === 'zh' ? '昼长' : 'Daylight'}
            <strong className="block text-xs text-current">{duration}</strong>
          </span>
          <span>
            {language === 'zh' ? '方位' : 'Azimuth'}
            <strong className="block text-xs text-current">
              {snapshot.azimuth?.toFixed(1) ?? '—'}°
            </strong>
          </span>
          <span>
            {language === 'zh' ? '高度' : 'Elevation'}
            <strong className="block text-xs text-current">
              {snapshot.elevation?.toFixed(1) ?? '—'}°
            </strong>
          </span>
        </div>
      ) : null}
      <div className="mt-1 text-[10px] text-current/45">
        {language === 'zh'
          ? `太阳：${snapshot.sunSource === 'home_assistant' ? 'Home Assistant' : '无实时数据'} · 月相：${snapshot.moonSource === 'entity' ? '实体' : '算法估算'}`
          : `Sun: ${snapshot.sunSource === 'home_assistant' ? 'Home Assistant' : 'no live data'} · Moon: ${snapshot.moonSource}`}
      </div>
    </div>
  );
}
