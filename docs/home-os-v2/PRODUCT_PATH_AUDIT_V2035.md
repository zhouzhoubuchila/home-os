# Home OS V2.0.3.5 Product Path Audit

Baseline: `origin/main@58bc0d3bc6293e108891b33c3ac97798c4821859`

This audit records the shipped product paths before V2.0.3.5 implementation. A semantic adapter is considered connected only when its output is consumed by the actual page and the final DOM, not merely by a Home OS demo/custom card or a unit test.

## Shared projection seam required by V2.0.3.5

The existing provider pipeline is sound and remains the source of truth:

`Provider runtime -> NavetProviderState -> integration store -> normalized NavetEntity -> mapNavetEntitiesToDeviceCollection -> page-specific model -> actual page -> Navet card -> DOM`

Home OS semantics currently branch after normalized `NavetEntity` through `useResolvedHomeOsEntities()`, but most actual product pages do not consume that branch. V2.0.3.5 therefore needs one app-owned, provider-neutral projection seam between normalized entities/Home OS semantics and page-specific models. Its public metadata is limited to `projectionId`, `sourceEntityIds`, `providerId`, `semanticSource`, and `commandTargets`; semantic roles and provider payloads stay behind the seam.

## Lighting

### Current source chain

`provider state -> integrationSelectors.providerDeviceCollectionById -> useDeviceCollectionsByKeys(sectionDeviceKeys) -> useDashboardController.lightDeviceMap -> dashboard-section-router -> LightsDashboard -> useProviderEntityModels(light ids) -> buildLightDashboardModel -> RoomLightCard -> LightCard -> DOM`

The separate V2.0.3.4 chain is:

`providerEntitiesByCanonicalId -> useResolvedHomeOsEntities -> resolveSemanticEntities -> buildHomeOsLights/buildLightCircuits -> HomeOsWidget only`

### Does the actual page consume Home OS semantics?

No. `lightDeviceMap` contains only entities already mapped to the native `lights` collection. Switches, helpers, and buttons classified as lighting circuits never enter the actual `LightsDashboard` model.

### Disconnects

- `buildHomeOsLights` feeds only the Home OS custom widget and tests.
- `buildLightDashboardModel` accepts `DeviceWithType` native lights only and represents state as a boolean, collapsing `unknown` and `unavailable` into off-like behavior.
- `LightCard` uses the displayed entity id for both identity/state and commands, so a projected circuit cannot keep a stable UI identity while routing commands to one or more source entities.
- Page summary, room grouping, scenes, and card rows are not derived from one shared projected lighting model.

### Required seam

Project semantic lighting circuits before `buildLightDashboardModel`. Produce one `HomeOsLightCircuit`-compatible, provider-neutral page model with explicit `on/off/unknown/unavailable`, stable projection identity, source ids, and command targets. `LightsDashboard` must consume it while retaining the native `LightCard` recipe for actionable rows.

## Security

### Current source chain

`provider state -> mapped cameras/covers/locks/sensors/persons/helpers -> SecuritySection -> isSecurityDashboardDevice/getSecurityGroupKey -> hidden/absorbed filtering -> buildSecurityCameraDashboardModel -> SecurityCameraDashboard -> SecurityCommandCenter/cards -> DOM`

Header count follows another branch:

`mapped security collections -> useHomeSecurityAlertCount -> selectHomeSecurityAlertDevices -> count`

Timeline follows:

`SecurityCommandCenter -> model.allEntities + summary.activityItems -> useSecurityActivityHistory -> provider history -> timeline DOM`

### Does the actual page consume Home OS semantics?

No. The actual collection, alert count, camera model, and history query rely on mapped `securityKind` plus local heuristics. V2.0.3.4 appliance and camera semantic classifications are not applied to these consumers.

### Disconnects

- Refrigerator doors, appliance child locks, and other `appliance.*` entities can retain door/lock security kinds and reach the real grid and count.
- Vacuum-map cameras are excluded only by a separate name heuristic in the camera model; that decision is not shared by the collection, count, and timeline.
- Grid, header count, and timeline do not consume one final filtered security collection.

### Required seam

Project normalized security entities once, excluding `appliance.*`, `vacuum.map_camera`, `appliance.camera`, `media.camera`, and diagnostic-only cameras before the actual Security collection. Feed the same final collection to the page model, alert count, and history/timeline entity list.

## Camera

### Current source chain

`Home Assistant states + registries -> homeassistant mapper/resources -> Navet camera device -> SecuritySection -> buildSecurityCameraDashboardModel -> local classifyCameraRole -> CameraCard/useProviderCameraLiveData -> snapshot/stream resource -> DOM`

### Does the actual page consume Home OS camera semantics?

No. Home OS `classifyCameraSemanticRole` is exercised by semantic resolution/tests, while the real camera dashboard uses its own local role and name heuristics.

### Disconnects

- The same camera may be classified differently by Home OS and the actual dashboard.
- A vacuum map or media artwork camera may be removed late or remain visible in counts/timeline.
- The final page cannot expose which normalized sources contributed to the projected camera without leaking provider details into UI components.

### Required seam

Use the shared security projection to emit only functional security cameras before `buildSecurityCameraDashboardModel`. Preserve existing resource resolution and `CameraCard`; attach projection metadata outside the visual component.

## Media

### Current source chain

`provider state -> Navet media_player -> mapNavetEntitiesToDeviceCollection (underlyingDeviceId from normalized deviceId/sourceDeviceId) -> MediaSection -> collapseSameRoomMediaGroups -> MediaDashboard -> useProviderMediaPlayerEntities -> createMediaDashboardDeviceIndex/active clusters -> MediaCard + browser -> DOM`

### Does the actual page consume a physical-device projection?

No. `underlyingDeviceId` is available, but the actual page does not aggregate all media entities by stable physical identity before rendering. Existing same-room and active-session grouping uses `groupMembers`, room, content, and normalized-name heuristics.

### Disconnects

- Multiple entities for one television/receiver can render as duplicate devices (for example, repeated “我的电视5”).
- Physical identity is conflated with playback/session grouping.
- Browser capability absence and supported-request failure do not have a complete three-state product model. Capability absence already avoids the provider call, but supported request failures are handled through a generic error toast instead of a stable inline retry state.

### Required seam

Aggregate media by `providerId + underlyingDeviceId` first, with a canonical-entity fallback only when physical identity is unavailable. Keep playback clusters separate. Emit representative state, unioned capabilities, source ids, and command targets. The browser model must explicitly represent `success`, `unsupported` (no API call/no toast), and `error` (inline retry).

## PVE

### Current source chain

Home card:

`provider entities -> Home OS semantic resolver -> buildPhysicalDevices -> HomeOsWidget(kind=pve) -> PveSummaryMetrics/CompactMeterListItem -> custom BaseCard -> DOM`

Detail page:

`useResolvedHomeOsEntities -> role-prefix filtering -> HomelabDetailPage -> one MetricDetailCard per entity -> DOM`

### Does the actual PVE card consume the mature Navet UPS recipe?

No. It uses `BaseCard` and compact meters, but does not reuse the full UPS composition.

### Disconnects

- Fixed emerald meter styling ignores UPS status-tone and tint conventions.
- No `EntityCardHeader`/`EntityCardHeaderIcon`, `CardMetric`, `CardEmptyState`, or coherent small/medium/large composition.
- No edit/settings path for selecting a projected PVE device/metrics even when the containing custom card supports updates.
- Diagnostics and primary operational metrics are not intentionally separated in the card composition.

### Required seam

Build a PVE view model from projected physical devices, then compose the actual Home OS PVE widget from the UPS recipe: `BaseCard`, entity header/icon, primary `CardMetric`, status-tone pill, responsive metric tiles, empty state, tint/theme surface, and settings/dialog patterns when update support is available. Keep PVE semantic metric selection in the projection/model layer.

## Sun and Moon

### Current source chain

`providerEntitiesByCanonicalId -> useResolvedHomeOsEntities -> HomeOsWidget(kind=lunar) -> AstronomyVisual -> HomeOsHassFacade/getAstronomySnapshot -> custom SVG/ellipse + homemade moon-phase approximation -> DOM`

Verified upstream source: `jayjojayson/Sun-Position-Card@730a1e145e064a0ccc885c795f74c81d61859a28` (MIT). The upstream card reads `sun.sun` azimuth/elevation and next-rising/next-setting attributes, optionally reads a Moon integration entity, and renders its own pinned image/arc recipes.

### Does the actual page consume the true upstream source port?

No. The repository contains an adapter-style file and provenance note, but no vendored upstream source/assets. The final visual is a locally invented ellipse/moon geometry rather than the pinned upstream recipe.

### Disconnects

- `AstronomyVisual` calculates and renders a custom moon shadow ellipse.
- `moon-phase.ts` estimates phase from a synodic-month formula rather than using the optional HA Moon entity/upstream image mapping.
- `getAstronomySnapshot` searches only the entities passed to the widget; although `useResolvedHomeOsEntities` subscribes to all normalized entities, the widget filters by the card definition before building the facade, so an unclassified `sun.sun` entity can be absent from the final visual.
- The current adapter does not prove source-level reuse.

### Required seam

Vendor the exact pinned MIT source assets/recipe with license and a port document. Add a thin typed facade from normalized `sun.sun` and optional Moon entity data to the port. Pass astronomy source entities independently of the card's semantic-role subset so live azimuth/elevation/rising/setting values reach the final DOM. Remove the homemade SVG ellipse and phase math from the shipped path.

## Dashboard Home

### Current source chain

`legacy/local persisted layout -> dashboard collection migration/normalization -> useHomeDashboardLayout -> HomeDashboardOverview -> presentation/edit renderer -> CardGrid/HomePresentationSection -> actual cards -> DOM`

### Does the actual page preserve legacy flow layout?

Only while `homeLayout.mode === 'flow'`. In sectioned mode the presentation renderer always displays every section title.

### Disconnects

- `setMode('sectioned')` creates a full-width section titled by the hard-coded `Section ${n}` convention and assigns all cards to it.
- The presentation path renders that title directly, so an accidental/persisted section-mode transition surfaces “Section 1” in the real dashboard.
- Section creation names are English constants rather than localized product copy.
- Section layout can change visible hierarchy/order even when the user did not intentionally configure a named section.

### Required seam

Keep the default/legacy dashboard in flow mode and preserve its card ids, order, sizes, custom cards, and hero setting. Treat a lone untouched auto-generated first section as a migration artifact: flatten its assignments back to flow without deleting cards. Named/user-created section layouts remain supported. Localize future generated section titles.

## Implementation gates derived from this audit

1. No actual feature page may import Home OS semantic-role constants.
2. Projection outputs are provider-neutral and carry command routing separately from display identity.
3. Lighting summary and page rows consume the same projected model.
4. Security grid, count, and timeline consume the same projected collection.
5. Media physical aggregation occurs before the real dashboard and is independent of playback clustering.
6. PVE and astronomy must reuse pinned Navet/upstream recipes, not approximate their appearance.
7. Product-path integration tests must render actual page components and assert final DOM behavior.
8. Storybook coverage must include four themes and mobile for the changed recipes.
