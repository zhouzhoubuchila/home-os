# Third-party notices

## Sun Position Card

- Repository: https://github.com/jayjojayson/Sun-Position-Card
- Pinned commit: `730a1e145e064a0ccc885c795f74c81d61859a28`
- Adapted source: `src/sun-position-card.js`
- Home OS adapter: `packages/app/src/features/home-os/astronomy/sun-position-card-adapter.ts`
- Home OS facade: `packages/app/src/features/home-os/astronomy/home-os-hass-facade.ts`
- Home OS rendering: `packages/app/src/features/home-os/astronomy/astronomy-visual.tsx`

The Home OS implementation ports and modifies the upstream sun path, night path,
daylight-duration, daypart and moon-display behavior. It does not include the
upstream custom element, `ha-card`, editor, or Home Assistant-only UI.

## Lunar Phase Card

- Repository: https://github.com/ngocjohn/lunar-phase-card
- Pinned source commit: `3a9eafd39cea1efb32da9aa2bb13af1e28324d5a`
- Adapted source: upstream `src/model/moon.ts`, section state machine, `moon-image`, `moon-base`,
  `moon-compact-view`, `moon-data-info`, `moon-chart-dynamic`, `moon-calendar-footer`,
  `moon-calendar-popup`, `lunar-phase-header`, and `lunar-star-particles`
- Vendored resources: `packages/app/src/features/home-os/astronomy/third_party/lunar-phase-card/moon_pic/`
- Vendored background resources: upstream PNGs `moon_bg_0.png` through `moon_bg_3.png`; `moon_bg_0` is the default and the other images are explicit custom-background options only
- Background behavior: direct `cover`/`center`/`no-repeat` rendering with no opacity, filter, mask, vignette, crossfade, or section-based image switching
- License: MIT, preserved in the adjacent `LICENSE` file
- Home OS rendering: `packages/app/src/features/home-os/components/cards/lunar/`

The Home OS implementation ports the upstream 31-image phase selection, moon image treatment,
section switching and 500ms transition, Swiper data pages, Chart.js dynamic horizon behavior,
calendar navigation/date selection, lazy star particles, left-image/right-data composition,
compact hierarchy, and SunCalc3 model behavior. The port replaces the upstream Lit base class,
`hass` object, `ha-card`/`ha-icon`, Lovelace editor/configuration, and Home Assistant theme/location
plumbing with React and Home OS adapters; it does not include the Home Assistant frontend runtime.
The four background images are used only as low-opacity, pointer-transparent card underlays.

## Audited visual references (no source copied)

- ApexCharts Card (`RomRider/apexcharts-card`), commit `6d3f1e9843f2d58ff73098128e78be8f57a5272b`, MIT. Home OS retains its existing Recorder-backed `TrendSparkline` instead of adding an iframe or chart runtime.
- Homelable (`Pouzor/homelable`), commit `e988427bb2d26ebf57e201e4368356c4a0109be1`, MIT; topology concepts reviewed only.
- Homelable HACS (`Pouzor/homelable-hacs`), commit `a807cbe4ba10530c53261c52232488af13a0b8db`, MIT; packaging concepts reviewed only.

MIT License

Copyright (c) 2025/2026 jayjojayson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
