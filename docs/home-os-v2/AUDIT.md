# Home OS V2 architecture audit

## A. Current architecture

The current `origin/main` is Home OS 1.0, published as two commits with a rewritten root history. Its tree is based on Navet 0.15.1 (`fbdc437e`) plus 45 changed files. The product remains the Navet standalone React app and Docker runtime, but Home OS code is composed directly in `@navet/app`.

Home OS-specific behavior is concentrated in `packages/app/src/features/home-os`, while navigation, the dashboard router, settings branding, PWA assets, Docker metadata, and deployment files are modified outside that boundary.

## B. Main fork changes relative to Navet

- Added a 512-line `home-os-sections.tsx` containing overview, room, device, family, scenes, energy, camera, and homelab surfaces.
- Added `home-os-model.ts`, which classifies normalized devices primarily through names and regular expressions.
- Added an extension registry whose main behavior is an `entityMatches` regular expression callback.
- Added six top-level navigation destinations and replaced Navet's normal climate, security, lights, media, and tasks navigation entries.
- Added multiple hard-coded branches and a fixed `HomeOsOverviewStrip` to `dashboard-section-router.tsx`.
- Added Home OS branding, PWA assets, GHCR workflow, Docker/Caddy deployment, and `lunar-javascript`.

## C. Code to retain

- Navet provider contracts, authentication, websocket lifecycle, command dispatch, dashboard editor, card layout, rooms, lighting, climate, media, cameras, security, energy, settings, PWA, and responsive foundations.
- The `features/home-os` extension boundary and the concept of a declarative extension registry.
- Provider-neutral reads from Navet normalized entities and command dispatch through Navet commands.
- GHCR multi-architecture publishing, `/data` volume mounting, Docker/Caddy deployment, attribution, and Home OS product assets.
- Chinese lunar-calendar support as an optional card capability.

## D. Code that must be refactored

- Replace `home-os-model.ts` as the core data entry with versioned configuration, semantic candidates, manual overrides, stable references, adapters, physical devices, freshness, and duration-aware alerts.
- Replace regex-driven extension discovery with capability, role, card, page, provider, history, and control declarations.
- Split `home-os-sections.tsx` into focused cards, pages, settings, hooks, and legacy compatibility code.
- Reduce the dashboard router to a thin Home OS route/card integration point.
- Reconnect Home OS cards to Navet's editable dashboard and Add Card flow.
- Add durable `/data` configuration persistence, schema validation, migrations, backup, import/export, reset, and recovery.

## E. Code to remove or deprecate

- Remove the fixed `HomeOsOverviewStrip` from the Home dashboard.
- Remove duplicate top-level Rooms, Devices, Scenes, Family, and Cameras navigation when Navet already owns those product capabilities.
- Deprecate the legacy regex model and monolithic section exports after V2 consumers are migrated.
- Remove immediate `unavailable` alerts, all-`on` assumptions, and name-only physical grouping from the active V2 path.

## F. Upstream conflict risk

High-risk files are `dashboard-section-router.tsx`, navigation configuration, settings composition, all locale files, the root package manifest/lockfile, PWA entry HTML, and Docker runtime files. The router currently contains most Home OS integration and will conflict with routine Navet dashboard work. V2 must keep core edits to small registries or composition hooks and document every remaining seam in `UPSTREAM.md`.

The fork's Git history was rewritten: `origin/main` has no merge base with upstream even though its tree is based on Navet 0.15.1. Future synchronization must use tree/patch comparison or restore ancestry before attempting a conventional rebase.

## G. Real Home Assistant data risks

- `DeviceWithType` loses some raw HA registry metadata needed for explainable classification and stable identity.
- Entity names are user-editable and multilingual; name heuristics cannot be authoritative.
- `device_tracker` values can be mistaken for household members without a person-first adapter.
- `switch` entities cannot safely be treated as lighting without explicit evidence or a manual override.
- `unknown` and `unavailable` are transient states, not immediate incidents.
- Entity IDs can change; mappings need provider, unique ID, and device ID recovery paths.
- Metrics need per-role freshness policies and explicit missing/stale states.

## H. Security risks

- Import payloads require schema and size validation before persistence.
- Export must use an allowlist and never include provider sessions, tokens, credentials, cookies, or authorization headers.
- Dangerous commands need capability checks and confirmation; bulk lighting actions must target only resolved lighting entities.
- Persistence endpoints must reuse Navet same-origin installation authorization and avoid logging payloads.
- External services must continue to enter through provider integrations rather than Home OS credentials.

## I. Performance risks

- The legacy model scans every device through several regular expressions on each map identity change.
- The monolithic sections module makes unrelated UI and lunar code load together.
- Broad dashboard subscriptions can rerender every Home OS surface for high-frequency provider updates.
- Mapping review on large installations needs indexed search, memoized resolution, and bounded rendering.
- Always-visible animations, blur layers, and nested card shells would be unsuitable for kiosk hardware.

## J. Recommended V2 architecture

```text
Navet normalized entities and provider capabilities
  -> Home OS semantic resolver
     -> manual override
     -> explicit metadata
     -> registry/device/area/integration metadata
     -> domain classifier
     -> low-priority name fallback
  -> semantic entities and physical-device models
  -> family, lighting, alert, energy, network, and homelab adapters
  -> Home OS card/page registries
  -> Navet dashboard cards and thin extension routes
```

Configuration is a versioned, provider-neutral document persisted through a same-origin `/data`-backed service. UI state consumes immutable resolved models, while provider commands remain behind Navet capability-aware command surfaces.

