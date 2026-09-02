const SYNODIC_MONTH_DAYS = 29.530588853;
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

const PHASE_NAMES = [
  { en: 'New moon', zh: '新月' },
  { en: 'Waxing crescent', zh: '蛾眉月' },
  { en: 'First quarter', zh: '上弦月' },
  { en: 'Waxing gibbous', zh: '盈凸月' },
  { en: 'Full moon', zh: '满月' },
  { en: 'Waning gibbous', zh: '亏凸月' },
  { en: 'Last quarter', zh: '下弦月' },
  { en: 'Waning crescent', zh: '残月' },
] as const;
const PHASE_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'] as const;

export interface MoonPhaseModel {
  phase: number;
  age: number;
  illumination: number;
  name: (typeof PHASE_NAMES)[number];
  icon: string;
}

const NORMALIZED_PHASE_INDEX: Record<string, number> = {
  new_moon: 0,
  waxing_crescent: 1,
  first_quarter: 2,
  waxing_gibbous: 3,
  full_moon: 4,
  waning_gibbous: 5,
  last_quarter: 6,
  waning_crescent: 7,
};

export function getMoonPhaseFromEntity(state: unknown): MoonPhaseModel | undefined {
  if (typeof state !== 'string') return undefined;
  const normalized = state.trim().toLowerCase().replace(/[ -]+/g, '_');
  const index = NORMALIZED_PHASE_INDEX[normalized];
  if (index === undefined) return undefined;
  const phase = index / 8;
  return {
    phase,
    age: phase * SYNODIC_MONTH_DAYS,
    illumination: (1 - Math.cos(phase * Math.PI * 2)) / 2,
    name: PHASE_NAMES[index] ?? PHASE_NAMES[0],
    icon: PHASE_ICONS[index] ?? PHASE_ICONS[0],
  };
}

export function getMoonPhase(date: Date): MoonPhaseModel {
  const daysSinceReference = (date.getTime() - REFERENCE_NEW_MOON_MS) / 86_400_000;
  const age = ((daysSinceReference % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const phase = age / SYNODIC_MONTH_DAYS;
  const index = Math.round(phase * 8) % 8;
  return {
    phase,
    age,
    illumination: (1 - Math.cos(phase * Math.PI * 2)) / 2,
    name: PHASE_NAMES[index] ?? PHASE_NAMES[0],
    icon: PHASE_ICONS[index] ?? PHASE_ICONS[0],
  };
}
