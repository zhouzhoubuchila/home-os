# Weather icon attribution

The weather condition mapping and icon behavior are ported from
[`pkissling/clock-weather-card`](https://github.com/pkissling/clock-weather-card)
at commit `11690cf76eb1b9557c6e1dec284c2c68add8e95d`.

The visual weather icon artwork is vendored from
[`Bas Milius/weather-icons`](https://github.com/basmilius/weather-icons),
licensed under the MIT License. Home OS bundles the selected line SVG variants
under this directory for animated and static modes; no runtime CDN is used.
The local React SVG primitives remain only as a defensive fallback for
unsupported conditions.

The upstream weather-card data and rendering behavior is based on
[`troinine/ha-weather-forecast-card`](https://github.com/troinine/ha-weather-forecast-card)
at commit `109763ae464cc757ef7566e67dd57985e01d9ada`, licensed under the MIT
License. This feature is a React adaptation inside Home OS and retains the
upstream attribution rather than copying the Lovelace card shell.
