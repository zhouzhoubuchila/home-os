import type { TranslateFn, TranslationKey } from '@navet/app/i18n';

const STATE_KEYS: Record<string, TranslationKey> = {
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

export function formatHomeOsDisplayState(value: unknown, t: TranslateFn) {
  if (value === null || value === undefined || value === '') return t('homeOs.state.unknown');
  if (typeof value === 'boolean') return t(value ? 'homeOs.state.on' : 'homeOs.state.off');
  const raw = String(value);
  const translationKey = STATE_KEYS[raw.trim().toLowerCase()];
  return translationKey ? t(translationKey) : raw;
}
