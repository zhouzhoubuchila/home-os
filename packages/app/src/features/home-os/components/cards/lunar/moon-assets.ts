/**
 * Adapted from ngocjohn/lunar-phase-card (MIT).
 *
 * Upstream's model selects one of 31 real moon images with
 * `Math.round(phaseValue * 30) % 31`. The images are vendored locally so
 * Home OS remains usable without a Home Assistant CDN or network access.
 */
const MOON_PIC_URLS = [
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/0_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/1_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/2_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/3_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/4_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/5_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/6_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/7_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/8_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/9_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/10_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/11_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/12_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/13_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/14_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/15_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/16_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/17_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/18_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/19_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/20_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/21_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/22_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/23_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/24_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/25_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/26_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/27_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/28_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/29_moon.webp', import.meta.url)
    .href,
  new URL('../../../astronomy/third_party/lunar-phase-card/moon_pic/30_moon.webp', import.meta.url)
    .href,
] as const;

export const UPSTREAM_LUNAR_PHASE_CARD_COMMIT = '3a9eafd39cea1efb32da9aa2bb13af1e28324d5a';

export function getUpstreamMoonImageUrl(phase: number) {
  const normalized = ((phase % 1) + 1) % 1;
  const phaseIndex = Math.round(normalized * 30) % 31;
  return { phaseIndex, url: MOON_PIC_URLS[phaseIndex] ?? MOON_PIC_URLS[0] };
}
