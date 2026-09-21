import type { ThemeType } from '@navet/app/hooks/use-theme';

/**
 * Shared visual language for the Lunar and Weather cards.
 *
 * These tokens intentionally describe surfaces and hierarchy only. They do
 * not contain card data or theme behavior, so each card can keep its own
 * subject matter and rendering model.
 */
export const LUNAR_WEATHER_CARD_TOKENS = {
  header: 'relative z-10 flex items-center gap-2',
  headerEyebrow: 'text-[0.62rem] font-medium uppercase tracking-[0.18em]',
  headerTitle: 'truncate text-sm font-medium tracking-[-0.01em]',
  headerControls: 'flex items-center gap-0.5',
  headerControl:
    'flex h-9 w-9 items-center justify-center rounded-md border border-current/10 text-current/45 transition-[background-color,color,opacity] hover:bg-current/8 hover:text-current/78 disabled:opacity-50',
  panel: 'rounded-2xl border p-4',
  nestedPanel: 'rounded-xl border px-3 py-2',
  chip:
    'rounded-md border px-2.5 py-1 text-xs font-medium transition-[background-color,border-color,color,box-shadow]',
  chart: 'h-48 min-h-0 w-full',
} as const;

export function getLunarWeatherPanelClassName(theme: ThemeType, compact = false) {
  const radius = compact ? 'rounded-xl' : 'rounded-2xl';
  const padding = compact ? 'px-3 py-2' : 'p-4';

  if (theme === 'light') {
    return `${radius} border border-sky-200/80 bg-white/72 shadow-[0_10px_26px_-20px_rgba(30,64,175,0.34)] backdrop-blur-sm ${padding}`;
  }

  if (theme === 'glass') {
    return `${radius} border border-white/16 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl ${padding}`;
  }

  if (theme === 'black') {
    return `${radius} border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${padding}`;
  }

  return `${radius} border border-white/12 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ${padding}`;
}

export function getLunarWeatherChipClassName(theme: ThemeType, active: boolean) {
  const base = LUNAR_WEATHER_CARD_TOKENS.chip;
  if (theme === 'light') {
    return `${base} ${active ? 'border-sky-300/90 bg-white text-sky-700 shadow-sm' : 'border-sky-200/80 bg-sky-50/70 text-slate-500 hover:bg-white'}`;
  }

  return `${base} ${active ? 'border-sky-300/35 bg-sky-300/14 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]' : 'border-white/10 bg-white/[0.035] text-current/55 hover:bg-white/8 hover:text-current/80'}`;
}
