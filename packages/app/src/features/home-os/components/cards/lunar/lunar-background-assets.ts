/**
 * Adapted from ngocjohn/lunar-phase-card (MIT), pinned at
 * 3a9eafd39cea1efb32da9aa2bb13af1e28324d5a.
 * Backgrounds are vendored locally so the card never depends on a CDN.
 */
export type LunarBackgroundVariant = 'bg0' | 'bg1' | 'bg2' | 'bg3' | 'none';
export type LunarBackgroundTheme = 'dark' | 'light';

type LunarBackgroundPreset = {
  position: string;
  opacity: number;
  filter: string;
};

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
  Record<LunarBackgroundTheme, LunarBackgroundPreset>
> = {
  bg0: {
    dark: {
      position: '50% 52%',
      opacity: 0.32,
      filter: 'saturate(.76) brightness(.76) contrast(.96)',
    },
    light: {
      position: '50% 52%',
      opacity: 0.07,
      filter: 'saturate(.46) brightness(1.08) contrast(.9)',
    },
  },
  bg1: {
    dark: {
      position: '50% 32%',
      opacity: 0.26,
      filter: 'saturate(.72) brightness(.72) contrast(.96)',
    },
    light: {
      position: '50% 32%',
      opacity: 0.06,
      filter: 'saturate(.44) brightness(1.08) contrast(.9)',
    },
  },
  bg2: {
    dark: {
      position: '50% 42%',
      opacity: 0.14,
      filter: 'saturate(.54) brightness(.58) contrast(.92)',
    },
    light: {
      position: '50% 42%',
      opacity: 0.04,
      filter: 'saturate(.38) brightness(1.08) contrast(.88)',
    },
  },
  bg3: {
    dark: {
      position: '32% 46%',
      opacity: 0.21,
      filter: 'saturate(.62) brightness(.68) contrast(.94)',
    },
    light: {
      position: '32% 46%',
      opacity: 0.06,
      filter: 'saturate(.42) brightness(1.08) contrast(.9)',
    },
  },
};

export function getLunarBackgroundConfig(
  variant: Exclude<LunarBackgroundVariant, 'none'>,
  theme: LunarBackgroundTheme
) {
  return LUNAR_BACKGROUND_CONFIG[variant][theme];
}

export function getLunarBackgroundVariant(
  section: string,
  expanded = false
): LunarBackgroundVariant {
  if (expanded || section === 'full_calendar') return 'bg2';
  if (section === 'horizon') return 'bg3';
  if (section === 'calendar') return 'bg1';
  return 'bg0';
}
