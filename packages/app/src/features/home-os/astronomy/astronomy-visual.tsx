import type { ResolvedSemanticEntity } from '../core/types';
import { HomeOsHassFacade } from './home-os-hass-facade';
import { getMoonPhaseFromEntity, type MoonPhaseModel } from './moon-phase';
import {
  calculateAstronomicalDaylightDuration,
  calculateDaylightDuration,
  calculateSunArcPosition,
  resolveSunDaypart,
  type SunArcPoint,
  type SunDaypart,
} from './sun-position-card-adapter';

const UPSTREAM_IMAGE_URLS = {
  'abend.png': new URL('./third_party/sun-position-card/images/abend.png', import.meta.url).href,
  'dammerung.png': new URL('./third_party/sun-position-card/images/dammerung.png', import.meta.url)
    .href,
  'first_quarter.png': new URL(
    './third_party/sun-position-card/images/first_quarter.png',
    import.meta.url
  ).href,
  'full_moon.png': new URL('./third_party/sun-position-card/images/full_moon.png', import.meta.url)
    .href,
  'last_quarter.png': new URL(
    './third_party/sun-position-card/images/last_quarter.png',
    import.meta.url
  ).href,
  'mittag.png': new URL('./third_party/sun-position-card/images/mittag.png', import.meta.url).href,
  'morgen.png': new URL('./third_party/sun-position-card/images/morgen.png', import.meta.url).href,
  'nachmittag.png': new URL(
    './third_party/sun-position-card/images/nachmittag.png',
    import.meta.url
  ).href,
  'new_moon.png': new URL('./third_party/sun-position-card/images/new_moon.png', import.meta.url)
    .href,
  'unterHorizont.png': new URL(
    './third_party/sun-position-card/images/unterHorizont.png',
    import.meta.url
  ).href,
  'waning_crescent.png': new URL(
    './third_party/sun-position-card/images/waning_crescent.png',
    import.meta.url
  ).href,
  'waning_gibbous.png': new URL(
    './third_party/sun-position-card/images/waning_gibbous.png',
    import.meta.url
  ).href,
  'waxing_crescent.png': new URL(
    './third_party/sun-position-card/images/waxing_crescent.png',
    import.meta.url
  ).href,
  'waxing_gibbous.png': new URL(
    './third_party/sun-position-card/images/waxing_gibbous.png',
    import.meta.url
  ).href,
} as const;

type UpstreamImageName = keyof typeof UPSTREAM_IMAGE_URLS;
const UNKNOWN_MOON: MoonPhaseModel = {
  phase: 0,
  age: 0,
  illumination: 0,
  name: { en: 'New moon', zh: '新月' },
  icon: '🌑',
};

const readDate = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
};

const readNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

function findMoonEntity(entities: readonly ResolvedSemanticEntity[]) {
  return entities.find((item) => {
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
}

function resolveUpstreamImage(
  isDay: boolean,
  azimuth: number | undefined,
  elevation: number | undefined,
  moonState: unknown
): UpstreamImageName {
  if (!isDay || (elevation ?? 0) <= 0) {
    const phase =
      typeof moonState === 'string'
        ? (`${moonState.trim().toLowerCase().replace(/[ -]+/g, '_')}.png` as UpstreamImageName)
        : undefined;
    return phase && phase in UPSTREAM_IMAGE_URLS ? phase : 'unterHorizont.png';
  }
  if ((elevation ?? 0) < 10) return 'dammerung.png';
  if ((azimuth ?? 0) < 150) return 'morgen.png';
  if ((azimuth ?? 0) < 200) return 'mittag.png';
  if ((azimuth ?? 0) < 255) return 'nachmittag.png';
  return 'abend.png';
}

export interface AstronomySnapshot {
  moon: MoonPhaseModel;
  moonSource: 'entity' | 'unavailable';
  moonState?: string;
  sunSource: 'home_assistant' | 'unavailable';
  sunrise?: Date;
  sunset?: Date;
  nextEvent?: Date;
  daylightProgress?: number;
  daylightDurationMs?: number;
  sunArcPoint?: SunArcPoint;
  daypart: SunDaypart;
  isDay: boolean;
  elevation?: number;
  azimuth?: number;
  upstreamImage: UpstreamImageName;
}

export function getAstronomySnapshot(
  entities: readonly ResolvedSemanticEntity[],
  now = new Date()
): AstronomySnapshot {
  const facade = new HomeOsHassFacade(entities);
  const sun = facade.getState('sun.sun');
  const moonEntity = findMoonEntity(entities);
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
  return {
    moon: entityMoon ?? UNKNOWN_MOON,
    moonSource: entityMoon ? 'entity' : 'unavailable',
    moonState: typeof moonEntity?.primaryState === 'string' ? moonEntity.primaryState : undefined,
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
    daypart: resolveSunDaypart(azimuth, elevation),
    isDay,
    elevation,
    azimuth,
    upstreamImage: resolveUpstreamImage(isDay, azimuth, elevation, moonEntity?.primaryState),
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
  const daypartNames: Record<SunDaypart, { en: string; zh: string }> = {
    below_horizon: { en: 'Below horizon', zh: '地平线下' },
    dawn: { en: 'Dawn', zh: '黎明' },
    morning: { en: 'Morning', zh: '上午' },
    noon: { en: 'Noon', zh: '正午' },
    afternoon: { en: 'Afternoon', zh: '下午' },
    evening: { en: 'Evening', zh: '傍晚' },
    dusk: { en: 'Dusk', zh: '黄昏' },
  };
  const moonName =
    snapshot.moonSource === 'entity'
      ? language === 'zh'
        ? snapshot.moon.name.zh
        : snapshot.moon.name.en
      : language === 'zh'
        ? '未连接月相实体'
        : 'Moon entity unavailable';

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
      data-upstream-commit="730a1e145e064a0ccc885c795f74c81d61859a28"
    >
      <div
        className={`${compact ? 'h-20' : 'h-32'} flex items-center justify-center overflow-hidden`}
      >
        <img
          src={UPSTREAM_IMAGE_URLS[snapshot.upstreamImage]}
          alt={moonName}
          className="h-full w-auto max-w-full object-contain"
          data-sun-position-card-image={snapshot.upstreamImage}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">{moonName}</span>
        <span className="tabular-nums text-current/60">
          {language === 'zh'
            ? daypartNames[snapshot.daypart].zh
            : daypartNames[snapshot.daypart].en}
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
      <div className="mt-2 flex justify-between gap-2 text-[10px] text-current/45">
        <span>
          {language === 'zh' ? `日出 ${time(snapshot.sunrise)}` : `Rise ${time(snapshot.sunrise)}`}
        </span>
        <span>
          {language === 'zh' ? `日落 ${time(snapshot.sunset)}` : `Set ${time(snapshot.sunset)}`}
        </span>
      </div>
    </div>
  );
}
