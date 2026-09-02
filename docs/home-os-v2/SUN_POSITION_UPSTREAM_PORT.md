# Sun Position Card upstream port

- Upstream: `https://github.com/jayjojayson/Sun-Position-Card`
- Pinned commit: `730a1e145e064a0ccc885c795f74c81d61859a28`
- License: MIT, preserved at `packages/app/src/features/home-os/astronomy/third_party/sun-position-card/LICENSE`
- Source snapshot: all 10 upstream `src/*.js` files under `packages/app/src/features/home-os/astronomy/third_party/sun-position-card/source/`
- Vendored visual assets: `packages/app/src/features/home-os/astronomy/third_party/sun-position-card/images/`

## Port boundary

`HomeOsHassFacade` is the thin source facade. It exposes normalized `sun.sun`, optional Moon integration state, and related `sensor.sun_next_*` values without exposing Home Assistant payloads to the React view.

The React port keeps the upstream classic image-selection recipe: dawn/dusk and azimuth thresholds select the pinned daytime assets; at night an optional Moon integration state selects the pinned moon-phase asset; otherwise the pinned below-horizon asset is shown. Live azimuth, elevation, sunrise, sunset, and daylight values remain text metrics around that recipe.

The shipped view does not draw a custom moon ellipse and does not estimate moon phase when the Moon integration is absent. Upstream source and assets are intentionally vendored so Home OS remains local-first and reproducible.
