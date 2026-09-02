# Home OS V2.0.3.5 Navet native recipe matrix

This matrix records complete product recipes, not isolated primitive imports. Every entry names the Home OS projection seam, the actual Navet consumer, and the native composition retained at render time.

| Surface | Home OS projection | Actual Navet consumer | Native recipe reused | Result |
| --- | --- | --- | --- | --- |
| Lighting | `buildHomeOsProductProjection().lighting` | `features/lighting/dashboard/lights-dashboard.tsx` | `LightsDashboard` room summaries, native `LightCard`, `BaseCard`, `EntityCardHeaderIcon`, batch-action feedback, edit remove action | PASS |
| Security / cameras | `projectSecurityDeviceCollection` | `components/layout/security-section.tsx` and `SecurityCameraDashboard` | Native security model, camera dashboard, alarms, timeline/history inputs, add/remove and card sizing | PASS |
| Media | `projectPhysicalMediaDevices` | `components/layout/media-section.tsx` and `MediaDashboard` | Native media workspace, media cards, browse tree, grouping, capability state, retry error state | PASS |
| PVE | `buildHomeOsProductProjection().pveDevices` | `PveHomeOsCard` through `HomeOsWidget` and `WidgetCard` | UPS/monitoring composition: `BaseCard`, `EntityCardHeader`, `EntityCardHeaderIcon`, `CardMetric`, compact KPI grid, status tone, `CardEmptyState`, `BaseCardDialogWithState`, `CardDialogSection`, `SelectableCheckboxRow`, `Select`, tint surface | PASS |
| Astronomy | `astronomyEntities` plus `HomeOsHassFacade` | `AstronomyVisual` in lunar card and detail dialog | Navet `BaseCard` shell around the exact pinned Sun Position Card raster/source recipe; live HA data, theme-safe surface, compact/detail variants | PASS |
| Dashboard layout | schema-v2 collection migration | Home dashboard collection and layout hook | Existing flow/sectioned layout engine, localized generated section title, targeted legacy migration only | PASS |

## PVE responsive composition

- Small: header, primary KPI, status and at most two metrics.
- Medium: header, primary KPI, status and at most four metrics in a two-column grid.
- Large: header, primary KPI, status and at most six metrics in a three-column grid.
- Edit mode: the standard Navet settings dialog selects a physical PVE device, visible metrics and tint without introducing a parallel settings system.

## Reuse boundary

The product projection owns semantic-to-functional identity, source entity IDs and command targets. Navet pages continue to own layout, interaction, accessibility, responsive sizing, theme surfaces, dialogs and command feedback. This keeps Home OS logic visible in the real product without forking stable Navet recipes.
