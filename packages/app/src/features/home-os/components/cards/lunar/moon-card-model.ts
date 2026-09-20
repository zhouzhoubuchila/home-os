import { getAstronomySnapshot } from '../../../astronomy/astronomy-visual';
import { HomeOsHassFacade } from '../../../astronomy/home-os-hass-facade';
import {
  getMoonPhase,
  getMoonPhaseFromEntity,
  type MoonPhaseModel,
} from '../../../astronomy/moon-phase';
import type { ResolvedSemanticEntity } from '../../../core/types';
import { calculateLunarSnapshot, type LunarLocation } from './lunar-engine';
import { getUpstreamMoonImageUrl } from './moon-assets';

export type MoonPhaseKey =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

const PHASE_KEYS: readonly MoonPhaseKey[] = [
  'new_moon',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full_moon',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

const PHASE_NAMES: Record<MoonPhaseKey, { en: string; zh: string }> = {
  new_moon: { en: 'New moon', zh: '新月' },
  waxing_crescent: { en: 'Waxing crescent', zh: '蛾眉月' },
  first_quarter: { en: 'First quarter', zh: '上弦月' },
  waxing_gibbous: { en: 'Waxing gibbous', zh: '盈凸月' },
  full_moon: { en: 'Full moon', zh: '满月' },
  waning_gibbous: { en: 'Waning gibbous', zh: '亏凸月' },
  last_quarter: { en: 'Last quarter', zh: '下弦月' },
  waning_crescent: { en: 'Waning crescent', zh: '残月' },
};

export interface MoonCardModel {
  date: Date;
  phase: number;
  phaseKey: MoonPhaseKey;
  phaseImageIndex: number;
  moonImageUrl: string;
  illumination: number;
  illuminationPercent: number;
  ageDays: number;
  source: 'entity' | 'calculated';
  isDay: boolean;
  sunrise?: Date;
  sunset?: Date;
  nextEvent?: Date;
  nextEventKind?: 'sunrise' | 'sunset';
  daylightDurationMs?: number;
  azimuth?: number;
  altitude?: number;
  distanceKm?: number;
  moonrise?: Date;
  moonset?: Date;
  moonHighest?: Date;
  nextFullMoon?: Date;
  nextNewMoon?: Date;
  location?: LunarLocation;
  locationSource: 'ha-config' | 'zone-home' | 'manual' | 'none';
}

export interface MoonCardModelOptions {
  /** Home Assistant instance metadata supplied by the provider layer. */
  location?: LunarLocation;
  /** Optional explicit Home OS fallback for installations without HA metadata. */
  manualLocation?: LunarLocation;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function getMoonPhaseKey(phase: number): MoonPhaseKey {
  const normalized = ((phase % 1) + 1) % 1;
  return PHASE_KEYS[Math.round(normalized * 8) % 8] ?? 'new_moon';
}

export function getMoonPhaseName(phaseKey: MoonPhaseKey, language: string) {
  return language === 'zh' ? PHASE_NAMES[phaseKey].zh : PHASE_NAMES[phaseKey].en;
}

function availableEntityMoon(entities: readonly ResolvedSemanticEntity[]) {
  for (const item of entities) {
    if (item.ignored || item.displayMode === 'hidden' || item.entity.availability !== 'available') {
      continue;
    }
    const moon = getMoonPhaseFromEntity(item.entity.primaryState);
    const text = `${item.entity.externalId} ${item.displayName}`.toLowerCase();
    if (moon && (item.entity.externalId.startsWith('moon.') || /moon|lunar|月相/.test(text))) {
      return moon;
    }
  }
  return undefined;
}

function nextEventKind(nextEvent: Date | undefined, sunrise?: Date, sunset?: Date) {
  if (!nextEvent) return undefined;
  if (sunrise?.getTime() === nextEvent.getTime()) return 'sunrise';
  if (sunset?.getTime() === nextEvent.getTime()) return 'sunset';
  return undefined;
}

function readNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getLunarLocationFromHomeAssistantConfig(
  config: { latitude?: unknown; longitude?: unknown } | null | undefined
): LunarLocation | undefined {
  const latitude = readNumber(config?.latitude);
  const longitude = readNumber(config?.longitude);
  return latitude === undefined || longitude === undefined ? undefined : { latitude, longitude };
}

function resolveLocation(
  entities: readonly ResolvedSemanticEntity[],
  options?: MoonCardModelOptions
): { location?: LunarLocation; source: MoonCardModel['locationSource'] } {
  if (options?.location) return { location: options.location, source: 'ha-config' };
  const facade = new HomeOsHassFacade(entities);
  const zone = facade.getState('zone.home');
  const latitude = readNumber(zone?.attributes.latitude);
  const longitude = readNumber(zone?.attributes.longitude);
  if (latitude !== undefined && longitude !== undefined) {
    return { location: { latitude, longitude }, source: 'zone-home' };
  }
  return options?.manualLocation
    ? { location: options.manualLocation, source: 'manual' }
    : { location: undefined, source: 'none' };
}

function toModel(
  moon: MoonPhaseModel,
  source: MoonCardModel['source'],
  astronomy: ReturnType<typeof getAstronomySnapshot>,
  date: Date,
  location: LunarLocation | undefined,
  locationSource: MoonCardModel['locationSource']
): MoonCardModel {
  const illumination = clamp01(moon.illumination);
  const phase = ((moon.phase % 1) + 1) % 1;
  const image = getUpstreamMoonImageUrl(phase);
  const calculated = calculateLunarSnapshot(date, location);
  return {
    date,
    phase,
    phaseKey: getMoonPhaseKey(moon.phase),
    phaseImageIndex: image.phaseIndex,
    moonImageUrl: image.url,
    illumination,
    illuminationPercent: Math.round(illumination * 100),
    ageDays: moon.age,
    source,
    isDay: astronomy.isDay,
    sunrise: astronomy.sunrise,
    sunset: astronomy.sunset,
    nextEvent: astronomy.nextEvent,
    nextEventKind: nextEventKind(astronomy.nextEvent, astronomy.sunrise, astronomy.sunset),
    daylightDurationMs: astronomy.daylightDurationMs,
    azimuth: calculated?.azimuth,
    altitude: calculated?.altitude,
    distanceKm: calculated?.distanceKm,
    moonrise: calculated?.rise,
    moonset: calculated?.set,
    moonHighest: calculated?.highest,
    nextFullMoon: calculated?.nextFullMoon,
    nextNewMoon: calculated?.nextNewMoon,
    location,
    locationSource,
  };
}

export function buildMoonCardModel(
  entities: readonly ResolvedSemanticEntity[],
  now = new Date(),
  options?: MoonCardModelOptions
): MoonCardModel {
  const astronomy = getAstronomySnapshot(entities, now);
  const entityMoon = availableEntityMoon(entities);
  const resolvedLocation = resolveLocation(entities, options);
  return entityMoon
    ? toModel(
        entityMoon,
        'entity',
        astronomy,
        now,
        resolvedLocation.location,
        resolvedLocation.source
      )
    : toModel(
        getMoonPhase(now),
        'calculated',
        astronomy,
        now,
        resolvedLocation.location,
        resolvedLocation.source
      );
}

export function buildMoonCardModelForDate(base: MoonCardModel, date: Date): MoonCardModel {
  const calculated = calculateLunarSnapshot(date, base.location);
  if (!calculated) {
    const fallback = getMoonPhase(date);
    const phase = ((fallback.phase % 1) + 1) % 1;
    const image = getUpstreamMoonImageUrl(phase);
    return {
      ...base,
      date,
      source: 'calculated',
      phase,
      phaseKey: getMoonPhaseKey(phase),
      phaseImageIndex: image.phaseIndex,
      moonImageUrl: image.url,
      illumination: fallback.illumination,
      illuminationPercent: Math.round(fallback.illumination * 100),
      ageDays: fallback.age,
      azimuth: undefined,
      altitude: undefined,
      distanceKm: undefined,
      moonrise: undefined,
      moonset: undefined,
      moonHighest: undefined,
      nextFullMoon: undefined,
      nextNewMoon: undefined,
    };
  }
  const image = getUpstreamMoonImageUrl(calculated.phase);
  return {
    ...base,
    date,
    source: 'calculated',
    phase: calculated.phase,
    phaseKey: getMoonPhaseKey(calculated.phase),
    phaseImageIndex: image.phaseIndex,
    moonImageUrl: image.url,
    illumination: calculated.illumination,
    illuminationPercent: Math.round(calculated.illumination * 100),
    ageDays: calculated.ageDays,
    azimuth: calculated.azimuth,
    altitude: calculated.altitude,
    distanceKm: calculated.distanceKm,
    moonrise: calculated.rise,
    moonset: calculated.set,
    moonHighest: calculated.highest,
    nextFullMoon: calculated.nextFullMoon,
    nextNewMoon: calculated.nextNewMoon,
  };
}

export function createMoonCardFixture(
  phaseKey: MoonPhaseKey,
  overrides: Partial<MoonCardModel> = {}
): MoonCardModel {
  const phase = PHASE_KEYS.indexOf(phaseKey) / 8;
  const image = getUpstreamMoonImageUrl(phase);
  const illumination = clamp01((1 - Math.cos(phase * Math.PI * 2)) / 2);
  return {
    date: new Date('2026-09-19T12:00:00+09:00'),
    phase,
    phaseKey,
    phaseImageIndex: image.phaseIndex,
    moonImageUrl: image.url,
    illumination,
    illuminationPercent: Math.round(illumination * 100),
    ageDays: phase * 29.530588853,
    source: 'entity',
    isDay: false,
    sunrise: new Date('2026-09-19T06:12:00+09:00'),
    sunset: new Date('2026-09-19T18:24:00+09:00'),
    nextEvent: new Date('2026-09-19T18:24:00+09:00'),
    nextEventKind: 'sunset',
    daylightDurationMs: 12 * 60 * 60 * 1000 + 12 * 60 * 1000,
    moonrise: new Date('2026-09-19T04:15:00+09:00'),
    moonset: new Date('2026-09-19T13:41:00+09:00'),
    moonHighest: new Date('2026-09-19T08:58:00+09:00'),
    nextFullMoon: new Date('2026-09-26T22:51:00+09:00'),
    nextNewMoon: new Date('2026-10-11T17:13:00+09:00'),
    azimuth: 195.4,
    altitude: 25,
    distanceKm: 405892,
    location: { latitude: 35.6762, longitude: 139.6503 },
    locationSource: 'manual',
    ...overrides,
  };
}
