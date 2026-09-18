# Home OS V2.0.4 Real Environment Coverage

This inventory describes the coverage on `codex/home-os-v2.0.4-stabilization` after the
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
| PVE | Covered | Broad normalized metric set plus raw HA numeric strings and Registry metadata through product projection | Multiple real PVE nodes and duplicate metrics from one node |
| Home Assistant | Partial | Raw System Monitor online and unrelated disk sensors prove positive and negative classification | Independent version/CPU/memory sources and unavailable host |
| Router | Partial | Raw OpenWrt client sensor proves Registry platform/device classification | Online status, WAN/LAN IP, throughput and multiple routers |
| Internet | Partial | Name fallback for latency and packet loss | WAN availability, numeric-string latency, packet loss and jitter as one real fixture |
| Electricity | Partial | One normalized State Grid daily-energy fixture | Raw Registry platform, units/state class, month and balance entities |
| Gas | Uncovered | Name fallback only | Real provider payload, unit semantics and account/usage distinction |
| Weather | Covered | Provider feature service tests plus raw HA fallback through semantic resolution | Additional unavailable provider and unit variants |
| Air quality | Partial | PM2.5/CO2 normalized resolver tests | Raw HA Registry/device metadata, unavailable values and several sensors with the same role |
| Calendar | Covered | Raw `calendar.*` entity reaches `family.calendar` with event attributes | Multiple calendars and unavailable state |
| Modes | Partial | Scene domain classifier behavior | Raw HA scene entity through Provider to Home OS and command routing |
| Cleaning | Partial | Vacuum mapper tests and a vacuum-map camera fixture | Raw vacuum entity through Provider to `home.cleaning`, unavailable and vendor status variants |
| Lunar / Astronomy | Covered | Raw `sun.sun` reaches astronomy projection; Moon phase and visual calculations have dedicated tests | Real Moon integration payload variants |

## Real-home fixture inventory

`packages/app/src/features/home-os/tests/fixtures/real-home/` currently covers:

- PVE status, CPU model/usage/load/temperature/IO wait, memory, KSM, storage, uptime, versions,
  update count, VM and LXC counts, malformed CPU and unknown telemetry.
- One light, explicit light action buttons, one action-only light and a doorbell screen-light
  negative case.
- Refrigerator door and child lock appliance semantics.
- Security camera and vacuum-map camera classification.
- A normalized weather entity, `sun.sun`, and `sensor.moon_phase`.

`home-assistant.ts` adds raw HA states, area/device/entity registries, numeric-string PVE metrics,
OpenWrt, System Monitor positive and negative cases, weather, calendar, `sun.sun`, and a stable
`unique_id` used to recover a renamed switch.

The fixtures do not currently cover family members, complete Home Assistant/router/Internet
telemetry, gas, complete air quality, scenes, or a real vacuum status entity.

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
- complete `homelab.home_assistant.*` telemetry beyond online-state classification
- router online, upload/download, WAN/LAN IP and complete Internet telemetry
- electricity month/balance and gas
- calendar in the Home OS pipeline
- manual mappings recovered after a real HA entity rename
- duplicate manual and automatic candidates for a single-value role

## Resolver coverage gaps

| Resolver | Current test shape | Gap |
|---|---|---|
| `classifyEntity` | Normalized and raw HA Registry fixtures | More vendor variants remain useful |
| `resolveSemanticEntity` | Manual priority, rename recovery and cross-provider collision tests | Multi-provider live capture remains unverified |
| `HomeOsDataSourceResolver` | Source precedence and duplicate manual ambiguity | Provider candidate conflicts need broader coverage |
| `resolveMetric` | State matrix and duplicate manual ambiguity | Future timestamps remain a P2 gap |
| `buildHomeOsProductProjection` | Raw HA PVE and astronomy path | Broader raw card projection remains useful |
| `resolveWeatherSource` | Provider and raw HA fallback | Unavailable raw weather variants remain |
| `buildPvePhysicalDevices` | Raw Registry device grouping plus broad normalized metrics | Duplicate physical metrics remain a P2 gap |

## High-risk regression protections

1. Provider metadata propagation is covered with Registry platform/device/unique-ID assertions.
2. Whole-home lighting rejects an action-only toggle button while preserving explicit off buttons.
3. Numeric HA sensor strings are covered in both classifier and raw-provider tests.
4. Entity rename recovery and identical native IDs across Providers have regression tests.
5. Multiple manual sources remain ambiguous until the user chooses one.
6. `weather`, `calendar`, and `sun` domain allowlists are covered at the Provider boundary.

## Remaining fixture additions

- State Grid and gas raw Registry fixtures with real units and account attributes.
- A full multi-provider entity collection with identical external IDs and distinct stable refs.
- A lighting fixture with explicit on/off buttons, a toggle-only button and a state sensor.
- Complete router and Internet fixtures with explicit units and unavailable/unknown variants.
- Air-quality fixtures for AQI, PM2.5, PM10, CO2, VOC, TVOC and HCHO from one physical device.
- Duplicate-candidate fixtures for PVE CPU, router online and Internet latency.
