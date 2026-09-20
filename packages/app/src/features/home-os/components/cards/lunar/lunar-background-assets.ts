/**
 * Adapted from ngocjohn/lunar-phase-card (MIT), pinned at
 * 3a9eafd39cea1efb32da9aa2bb13af1e28324d5a.
 * Backgrounds are vendored locally so the card never depends on a CDN.
 */
export type LunarBackgroundVariant = 'bg0' | 'bg1' | 'bg2' | 'bg3' | 'none';

export const LUNAR_BACKGROUND_ASSETS: Record<Exclude<LunarBackgroundVariant, 'none'>, string> = {
  bg0: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_0.webp',
    import.meta.url
  ).href,
  bg1: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_1.webp',
    import.meta.url
  ).href,
  bg2: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_2.webp',
    import.meta.url
  ).href,
  bg3: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_3.webp',
    import.meta.url
  ).href,
};

export const LUNAR_BACKGROUND_CONFIG: Record<
  Exclude<LunarBackgroundVariant, 'none'>,
  { position: string; opacity: number; filter: string }
> = {
  bg0: {
    position: '50% 52%',
    opacity: 0.26,
    filter: 'saturate(.70) brightness(.70) contrast(.96)',
  },
  bg1: {
    position: '50% 32%',
    opacity: 0.2,
    filter: 'saturate(.68) brightness(.68) contrast(.96)',
  },
  bg2: {
    position: '50% 42%',
    opacity: 0.14,
    filter: 'saturate(.54) brightness(.58) contrast(.92)',
  },
  bg3: {
    position: '32% 46%',
    opacity: 0.17,
    filter: 'saturate(.58) brightness(.64) contrast(.94)',
  },
};

export function getLunarBackgroundVariant(
  section: string,
  expanded = false
): LunarBackgroundVariant {
  if (expanded || section === 'full_calendar') return 'bg2';
  if (section === 'horizon') return 'bg3';
  if (section === 'calendar') return 'bg1';
  return 'bg0';
}
