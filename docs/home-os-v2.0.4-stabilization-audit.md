# Home OS V2.0.4 Stabilization Audit

Branch: `codex/home-os-v2.0.4-stabilization`  
Baseline: `c5231e7` (`origin/main`)  
Scope: data correctness, semantic mapping, provider compatibility and low-risk diagnostics. Card
System V2, Moon Card V2, deployment changes and visual redesign are out of scope.

## 1. Current data architecture

Home OS consumes provider-neutral `NavetEntity` records from the integration store. Home
Assistant owns raw entity/registry translation in `@navet/provider-homeassistant`; the Home OS app
layer then classifies those normalized entities into semantic roles, resolves manual overrides,
groups physical/functional devices and projects card-specific data.

The current ownership is appropriate:

- `@navet/provider-homeassistant`: raw HA state and Registry normalization.
- `@navet/core`: provider-neutral entity and command contracts.
- `@navet/app/features/home-os`: semantic roles, mapping, projections, cards and persisted Home OS
  configuration.

The main stability risk is the boundary between the first and third layers: Home OS classifiers
ask for stable Registry metadata, but the HA mapper does not currently preserve all of it.

## 2. Entity mapping data flow

```text
Home Assistant state + area/device/entity registries
  -> mapHomeAssistantEntitiesToNavetEntities
  -> NavetEntity (provider-scoped canonical ID)
  -> classifyEntity
  -> SemanticCandidate[] (role, confidence, source, reasons)
  -> resolveSemanticEntity
     -> manual mapping wins when found
     -> final roles, display/control policy, review state
  -> buildHomeOsIndexes / HomeOsDataSourceResolver / resolveMetric
  -> functional and physical device adapters
  -> buildHomeOsProductProjection
  -> Home OS card and detail surface
```

Manual mappings are persisted in schema version 2 and already outrank automatic candidates. The
storage and `/data` contract do not need a schema migration for the fixes proposed here.

## 3. Semantic role system

`HOME_OS_ROLES` is an open string-based taxonomy. It covers family, lighting, environment,
security, diagnostics, PVE, appliances, Home Assistant health, energy, router/Internet, weather,
cameras, calendar, modes and cleaning.

Strengths:

- candidates retain confidence, source and reasons;
- device-class compatibility tables exist for PVE/router/cameras;
- uncertain candidates can be surfaced for review;
- manual roles, display policy and control policy are persisted separately from provider state.

Risks:

- open strings allow unknown roles without compile-time validation;
- one entity may receive multiple roles, but some consumers only show the first;
- single-value metric resolution and list-style cards use different ambiguity rules;
- classifier inputs depend on metadata that is not fully transported by the HA mapper.

## 4. Card to semantic role and source matrix

| Card | Semantic role(s) | Expected entity | Required attributes | Optional attributes | Fallback | Current resolver | Potential problem |
|---|---|---|---|---|---|---|---|
| Household | `family.person`, `family.tracker` | `person.*`, `device_tracker.*` | state, provider ID | person link, location, battery, image | person state only | family adapter | Tracker-to-person link is rarely present in normalized state |
| Lighting | `lighting.light`, `lighting.switch` | `light.*`, approved switch/button | capabilities, state | device/room, brightness, color | manual functional device | light circuit builder | Toggle-only button is unsafe for whole-home off |
| Alerts | security/diagnostic/homelab roles | sensor/binary sensor | role, state, timestamps | unit, device/room | custom rule by entity ID | alert engine | Missing `last_changed` weakens duration accuracy |
| PVE | `homelab.pve.*` | Proxmox sensors | platform/device context, numeric value/unit | device ID/name | manual mapping | compatibility matrix + physical adapter | Raw numeric states are strings; Registry metadata is dropped |
| Home Assistant | `homelab.home_assistant.*` | System Monitor/version/connectivity sensors | platform and metric meaning | unit | manual mapping | classifier | Generic System Monitor metrics can become false online state |
| Router | `network.router.*` | OpenWrt/UniFi/router sensors | platform/device context, metric evidence | unit, device ID | manual mapping | router compatibility | Real platform metadata is not transported |
| Internet | `network.internet.*` | WAN probe/latency/loss sensors | metric evidence and unit | platform/device | low-confidence name fallback | classifier + metric resolver | Online role has no strong automatic rule; multiple probes can conflict |
| Electricity | `energy.electricity.*` | grid/energy sensors | unit/state class and source integration | device ID | name fallback/manual | classifier | Only `today` has an automatic fallback; integration metadata is lost |
| Gas | `energy.gas.current` | gas account/usage sensor | source context and unit | account metadata | name fallback/manual | classifier | Usage and balance are not distinguished |
| Weather | `weather.current` | provider weather or `weather.*` | condition/current values | forecast and units | normalized weather entity | provider service then weather resolver | Provider fallback entity is dropped by current normalized mapper |
| Air Quality | `environment.air_quality.*` | sensor metrics | device class or strong metric name/unit | device grouping | none | classifier + air source resolver | Multiple metrics are displayed without physical-device grouping |
| Calendar | `family.calendar` | `calendar.*` | state | message/start/end | none | domain classifier | Domain is currently dropped by HA normalized mapper |
| Modes | `home.mode` | `scene.*` | state/capability | room | none | domain classifier | Broad scene mapping may include non-household scenes |
| Cleaning | `home.cleaning` | `vacuum.*`, `lawn_mower.*` | state | battery/vendor attributes | none | domain classifier + provider mapper | Normalized vendor status coverage is broader than Home OS fixture coverage |
| Lunar / Astronomy | astronomy domain entities | `sun.sun`, Moon sensor | sun attributes / Moon phase state | coordinates, rise/set | local lunar date only | astronomy facade | `sun` is dropped by HA normalized mapper |

## 5. Findings and priority

### P0

1. **Unsafe whole-home off fallback.** If a lighting circuit only exposes a toggle button,
   `getWholeHomeLightActions` emits `trigger`. A toggle can turn an already-off circuit on, so it is
   not a valid whole-home off target.

### P1

1. **HA Registry metadata is lost at the Provider boundary.** `platform`, device name,
   manufacturer, model and `unique_id` are not present in `NavetEntity.attributes`. PVE/router/
   energy classification and rename-safe manual mapping therefore work in normalized unit fixtures
   but can fail in the real path.
2. **Raw HA numeric state incompatibility.** PVE rules require `typeof primaryState === 'number'`,
   while HA WebSocket sensor states are strings. Valid CPU/memory/storage percentages can be
   rejected.
3. **Required domains are filtered out.** `sun`, `calendar` and `weather` are supported by the
   core entity type and Home OS roles/cards, but are absent from the HA mapper allowlist. Astronomy
   cannot receive `sun.sun`; Calendar cannot receive `calendar.*`; weather entity fallback is not
   reachable through normalized provider state.
4. **Provider-scoped manual identity is not enforced for exact IDs.** An exact native ID match wins
   even when the saved stable ref names a different Provider.
5. **Multiple manual sources select arbitrarily.** Single-value resolution chooses the first manual
   candidate instead of reporting ambiguity.

### P2

1. Missing or invalid timestamps can be treated as fresh by `resolveMetric`; future timestamps are
   also accepted.
2. Physical PVE metrics overwrite duplicate roles according to input order.
3. Home Assistant health defaults any unmatched System Monitor entity to `online`, which can bind a
   disk or network sensor incorrectly.
4. Electricity and gas taxonomies are incomplete for real provider variants and units.
5. Some cards consume all role matches while detail diagnostics require an accepted mapping, so an
   entity under review may appear in one surface and be absent in another.

### P3

1. Mapping rows show only the first automatic/final role and hide the complete reason list.
2. Required-card-role diagnostics are implicit rather than a structured development artifact.
3. `SemanticRole` is an unconstrained string, so misspelled custom roles are detected only at
   runtime.

## 6. Duplicate and conflict behavior

- `resolveMetric` correctly reports multiple automatic mapped candidates as ambiguous.
- Manual mappings win over automatic mappings, but multiple manual candidates currently bypass the
  ambiguity check.
- `HomeOsDataSourceResolver` uses manual > semantic > provider > raw candidate precedence, but also
  selects the first manual candidate.
- Physical-device aggregation uses one `semanticMetrics[role]` slot and overwrites duplicates.
- Lighting grouping prefers device ID, then a room/name/integration heuristic. Missing Registry
  device IDs increase accidental splitting or merging risk.

## 7. Unavailable, unknown and stale data

- The HA mapper normalizes literal `unavailable` and `unknown` into availability.
- `resolveMetric` rejects null and the two literal state values, then applies role-specific stale
  thresholds.
- Static versions never go stale; account/month metrics use a seven-day threshold; connectivity
  uses five minutes; telemetry uses fifteen minutes.
- Missing timestamps currently pass as available. Physical-device freshness instead treats a
  missing timestamp as stale, so the two paths disagree.
- Alert duration uses `stateChangedAt`, `lastChanged`, then `lastUpdated`; Provider mapping currently
  carries `lastChanged` only inside selected state shapes.

## 8. Provider compatibility risks

- Home Assistant is the only advanced provider, but Home OS mapping must remain provider-neutral.
- Entity IDs are native and can collide across Provider sessions; canonical IDs are provider
  scoped.
- The HA mapper selectively copies attributes. Every classifier field must be explicitly preserved
  or classifier behavior will differ between direct tests and production.
- Homey/openHAB may not supply HA Registry metadata. Automatic rules must degrade to unmapped/review,
  not assume Home Assistant fields.

## 9. Diagnostics assessment

Existing mapping settings show entity ID, domain, room, first auto role, confidence, first final
role and source. The editor shows the first candidate reason. Metric detail shows candidates and
the selected entity for a subset of cards.

Missing structured diagnostics:

- all detected roles and role-specific reasons;
- explicit auto/manual source per final role;
- final selected entity per card/role;
- ambiguous sources;
- required card roles with no source.

The stabilization change should add a pure structured diagnostic builder and expose its snapshot
only in development mode. It must not add production UI or persisted fields.

## 10. Real environment coverage

See [REAL_ENVIRONMENT_COVERAGE.md](home-os-v2/REAL_ENVIRONMENT_COVERAGE.md). The largest current
gap is the absence of a raw HA state + Registry fixture that reaches semantic resolution and
product projection.

## 11. Planned low-risk fixes

1. P0: exclude toggle-only buttons from whole-home off actions.
2. P1: preserve stable HA Registry/device metadata and supported domains in normalized entities.
3. P1: accept finite numeric HA state strings in PVE numeric compatibility checks.
4. P1: respect Provider identity in manual mappings and report duplicate manual sources as
   ambiguous.
5. Add a raw HA real-environment fixture and end-to-end regressions.
6. Add development-only structured diagnostics without changing production UI or persistence.

## 12. Compatibility constraints

The proposed work does not rename roles/card IDs, change Docker/Nginx, modify `/data`, change the
Home OS configuration schema, remove manual overrides or change dashboard persistence. Existing
schema-v2 mappings without new stable metadata remain readable.
