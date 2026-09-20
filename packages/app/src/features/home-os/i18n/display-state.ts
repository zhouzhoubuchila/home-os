import type { TranslateFn, TranslationKey } from '@navet/app/i18n';

const STATE_KEYS: Record<string, TranslationKey> = {
  good: 'homeOs.state.clear',
  idle: 'homeOs.state.off',
  detected: 'homeOs.state.detected',
  clear: 'homeOs.state.clear',
  door: 'homeOs.state.door',
  opening: 'homeOs.state.opening',
  open: 'homeOs.state.open',
  closed: 'homeOs.state.closed',
  on: 'homeOs.state.on',
  off: 'homeOs.state.off',
  home: 'homeOs.state.home',
  not_home: 'homeOs.state.away',
  away: 'homeOs.state.away',
  unavailable: 'homeOs.state.unavailable',
  unknown: 'homeOs.state.unknown',
  connectivity: 'homeOs.state.connectivity',
  problem: 'homeOs.state.problem',
  stale: 'homeOs.state.stale',
  warning: 'homeOs.state.warning',
};

const WEATHER_CONDITIONS: Record<string, { en: string; zh: string }> = {
  'clear-night': { en: 'Clear night', zh: '晴朗夜间' },
  sunny: { en: 'Sunny', zh: '晴' },
  cloudy: { en: 'Cloudy', zh: '多云' },
  rainy: { en: 'Rainy', zh: '有雨' },
  pouring: { en: 'Pouring rain', zh: '大雨' },
  lightning: { en: 'Lightning', zh: '雷电' },
  'lightning-rainy': { en: 'Thunderstorms', zh: '雷雨' },
  snowy: { en: 'Snowy', zh: '下雪' },
  fog: { en: 'Fog', zh: '雾' },
  windy: { en: 'Windy', zh: '有风' },
  'partlycloudy': { en: 'Partly cloudy', zh: '多云间晴' },
  'partly-cloudy': { en: 'Partly cloudy', zh: '多云间晴' },
};

export function formatHomeOsWeatherCondition(value: unknown, language: string) {
  const raw = String(value ?? '').trim();
  const condition = WEATHER_CONDITIONS[raw.toLowerCase()];
  return condition ? condition[language.toLowerCase().startsWith('zh') ? 'zh' : 'en'] : raw;
}

export function formatHomeOsValueWithUnit(value: unknown, unit: unknown) {
  const rawUnit = typeof unit === 'string' ? unit.trim() : '';
  const normalizedUnit = rawUnit.toLowerCase();
  if (!rawUnit) return String(value ?? '—');
  if (normalizedUnit === 'celsius' || normalizedUnit === '°c' || normalizedUnit === 'c') {
    return `${String(value ?? '—')}°C`;
  }
  if (normalizedUnit === 'fahrenheit' || normalizedUnit === '°f' || normalizedUnit === 'f') {
    return `${String(value ?? '—')}°F`;
  }
  if (rawUnit === '%' || rawUnit === '°') return `${String(value ?? '—')}${rawUnit}`;
  return `${String(value ?? '—')} ${rawUnit}`;
}

export function formatHomeOsDisplayState(value: unknown, t: TranslateFn) {
  if (value === null || value === undefined || value === '') return t('homeOs.state.unknown');
  if (typeof value === 'boolean') return t(value ? 'homeOs.state.on' : 'homeOs.state.off');
  const raw = String(value);
  const translationKey = STATE_KEYS[raw.trim().toLowerCase()];
  return translationKey ? t(translationKey) : raw;
}
