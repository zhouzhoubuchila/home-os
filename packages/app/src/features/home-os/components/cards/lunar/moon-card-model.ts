import { getAstronomySnapshot } from '../../../astronomy/astronomy-visual';
import {
  getMoonPhase,
  getMoonPhaseFromEntity,
  type MoonPhaseModel,
} from '../../../astronomy/moon-phase';
import type { ResolvedSemanticEntity } from '../../../core/types';
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

function toModel(
  moon: MoonPhaseModel,
  source: MoonCardModel['source'],
  astronomy: ReturnType<typeof getAstronomySnapshot>
): MoonCardModel {
  const illumination = clamp01(moon.illumination);
  const phase = ((moon.phase % 1) + 1) % 1;
  const image = getUpstreamMoonImageUrl(phase);
  return {
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
    azimuth: astronomy.azimuth,
    altitude: astronomy.elevation,
  };
}

export function buildMoonCardModel(
  entities: readonly ResolvedSemanticEntity[],
  now = new Date()
): MoonCardModel {
  const astronomy = getAstronomySnapshot(entities, now);
  const entityMoon = availableEntityMoon(entities);
  return entityMoon
    ? toModel(entityMoon, 'entity', astronomy)
    : toModel(getMoonPhase(now), 'calculated', astronomy);
}

export function createMoonCardFixture(
  phaseKey: MoonPhaseKey,
  overrides: Partial<MoonCardModel> = {}
): MoonCardModel {
  const phase = PHASE_KEYS.indexOf(phaseKey) / 8;
  const image = getUpstreamMoonImageUrl(phase);
  const illumination = clamp01((1 - Math.cos(phase * Math.PI * 2)) / 2);
  return {
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
    ...overrides,
  };
}
