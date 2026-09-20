/** Local equivalents of lunar-phase-card's custom background URLs. */
export type LunarBackgroundVariant = 'bg0' | 'bg1' | 'bg2' | 'bg3' | 'none';

export const LUNAR_BACKGROUND_ASSETS: Record<Exclude<LunarBackgroundVariant, 'none'>, string> = {
  bg0: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_0.png',
    import.meta.url
  ).href,
  bg1: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_1.png',
    import.meta.url
  ).href,
  bg2: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_2.png',
    import.meta.url
  ).href,
  bg3: new URL(
    '../../../astronomy/third_party/lunar-phase-card/background/moon_bg_3.png',
    import.meta.url
  ).href,
};

export function getLunarBackgroundAsset(variant: LunarBackgroundVariant = 'bg0') {
  return variant === 'none' ? undefined : LUNAR_BACKGROUND_ASSETS[variant];
}
