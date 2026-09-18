# Home OS V2.0.4 Real Environment Coverage

This inventory describes the coverage on `codex/home-os-v2.0.4-stabilization` before the
stabilization fixes. A "real" fixture means a payload shaped like an actual provider response or a
captured Home OS entity set. Small inline `homeOsEntity()` objects remain useful unit fixtures, but
they do not prove the Home Assistant to card path.

## Coverage levels

- **Covered**: realistic fixture exercises the provider or full Home OS path and asserts the final
  role or projection.
- **Partial**: a normalized fixture or isolated resolver test exists, but at least one production
  boundary is skipped.
- **Uncovered**: only generic mocks exist, or no test reaches the card data path.

## Card coverage

| Card | Coverage | Current evidence | Missing real-environment evidence |
|---|---|---|---|
| Household | Partial | Person/tracker resolver and family adapter unit tests | HA Registry relationship, renamed entities, multiple trackers and unavailable person state |
| Lighting | Partial | Real-home light/button grouping and action tests | Generic room switch, multi-gang relay and HA Registry metadata through the provider mapper |
| Alerts | Partial | Default rule and duration tests; PVE temperature and appliance fixtures | Real HA `last_changed`, unknown/unavailable alerts and conflicting roles |
| PVE | Partial | Broad normalized `REAL_HOME_FIXTURE` metric set | Raw HA string states, Registry platform/device metadata and duplicate role selection |
| Home Assistant | Uncovered | Classifier-only integration heuristics | Real System Monitor entities and independent online/version/CPU/memory sources |
| Router | Partial | OpenWrt/TP-Link normalized classifier cases | Raw Registry platform metadata, online status, WAN/LAN IP and multiple routers |
| Internet | Partial | Name fallback for latency and packet loss | WAN availability, numeric-string latency, packet loss and jitter as one real fixture |
| Electricity | Partial | One normalized State Grid daily-energy fixture | Raw Registry platform, units/state class, month and balance entities |
| Gas | Uncovered | Name fallback only | Real provider payload, unit semantics and account/usage distinction |
| Weather | Partial | Provider feature service tests and normalized fallback entity | Home OS fallback from a raw HA weather entity, unavailable provider and unit variants |
| Air quality | Partial | PM2.5/CO2 normalized resolver tests | Raw HA Registry/device metadata, unavailable values and several sensors with the same role |
| Calendar | Partial | General calendar feature hook/service tests | Home OS semantic path from raw `calendar.*` entity to `family.calendar` |
| Modes | Partial | Scene domain classifier behavior | Raw HA scene entity through Provider to Home OS and command routing |
| Cleaning | Partial | Vacuum mapper tests and a vacuum-map camera fixture | Raw vacuum entity through Provider to `home.cleaning`, unavailable and vendor status variants |
| Lunar / Astronomy | Partial | Normalized `sun.sun` and Moon sensor tests | Raw `sun.sun` currently does not enter the normalized Provider entity collection |

## Real-home fixture inventory

`packages/app/src/features/home-os/tests/fixtures/real-home/` currently covers:

- PVE status, CPU model/usage/load/temperature/IO wait, memory, KSM, storage, uptime, versions,
  update count, VM and LXC counts, malformed CPU and unknown telemetry.
- One light, explicit light action buttons, one action-only light and a doorbell screen-light
  negative case.
- Refrigerator door and child lock appliance semantics.
- Security camera and vacuum-map camera classification.
- A normalized weather entity, `sun.sun`, and `sensor.moon_phase`.

The fixture does not currently cover family members, Home Assistant health, complete router and
Internet telemetry, gas, air quality, calendar, scenes, or a real vacuum status entity.

## Semantic role coverage

### Covered or partially covered

- `lighting.light`, `lighting.switch`, `device.switch`
- `environment.temperature`, `environment.air_quality.pm25`,
  `environment.air_quality.co2`
- `security.door`, `security.camera`, `security.doorbell_camera`
- `appliance.refrigeration_temperature`, `appliance.door`, `appliance.child_lock`
- most `homelab.pve.*` roles in normalized fixtures
- selected `network.router.*` and `network.internet.latency`
- `weather.current`, `home.mode`, `home.cleaning`, `family.person`, `family.tracker`

### Missing real fixture coverage

- `environment.humidity`, AQI, PM10, VOC, TVOC and HCHO as one realistic sensor family
- water leak, smoke, window, connectivity and battery edge states
- `homelab.home_assistant.*`
- router online, upload/download, WAN/LAN IP and complete Internet telemetry
- electricity month/balance and gas
- calendar in the Home OS pipeline
- manual mappings recovered after a real HA entity rename
- duplicate manual and automatic candidates for a single-value role

## Resolver coverage gaps

| Resolver | Current test shape | Gap |
|---|---|---|
| `classifyEntity` | Mostly normalized `NavetEntity` objects | Registry metadata loss is bypassed |
| `resolveSemanticEntity` | Good manual priority and confidence unit tests | Cross-provider exact-ID collision is not tested |
| `HomeOsDataSourceResolver` | Basic source precedence | Availability/staleness and duplicate manual sources are not covered |
| `resolveMetric` | State matrix covered | Multiple manual sources and numeric-string values are not covered |
| `buildHomeOsProductProjection` | Manually constructed resolved entities | Raw HA to projection path is not covered |
| `resolveWeatherSource` | Provider and normalized fallback tests | Raw HA fallback is not covered |
| `buildPvePhysicalDevices` | Normalized PVE fixture | Registry device grouping and duplicate metric roles are not covered |

## High-risk regression areas

1. Provider metadata propagation. Classifier accuracy depends on fields that the HA mapper may
   omit.
2. Whole-home lighting actions. An action-only toggle button must never be treated as an explicit
   off command.
3. Numeric HA sensor states. HA transports sensor states as strings even when they represent a
   number.
4. Manual mapping identity. Entity renames and identical native IDs across providers must not bind
   the wrong mapping.
5. Single-source metric selection. Multiple strong candidates must remain ambiguous until the
   user chooses one.
6. Domain allowlists. A card can have resolver tests while the Provider silently drops that domain.

## Recommended fixture additions

- A raw HA Registry fixture containing PVE, OpenWrt, System Monitor, State Grid, `sun.sun`,
  `calendar.family`, weather and a renamed entity with a stable `unique_id`.
- A multi-provider fixture with identical external IDs and distinct provider-scoped stable refs.
- A lighting fixture with explicit on/off buttons, a toggle-only button and a state sensor.
- Complete router and Internet fixtures with explicit units and unavailable/unknown variants.
- Air-quality fixtures for AQI, PM2.5, PM10, CO2, VOC, TVOC and HCHO from one physical device.
- Duplicate-candidate fixtures for PVE CPU, router online and Internet latency.
