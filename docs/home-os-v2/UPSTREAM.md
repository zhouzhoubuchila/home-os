# Navet upstream compatibility

## Baseline

- V2.0.3.4 canonical audit: `awesomestvi/navet` main at `a25d85acbd362f7381b06d78cd0fae26cdaf2eb8` (Navet 0.15.4 line).
- Discovery-only fork `hhellofomo/navet` was not used as an authority or merge source.
- Sun Position Card source is pinned at `730a1e145e064a0ccc885c795f74c81d61859a28`; MIT notice remains in `THIRD_PARTY_NOTICES.md`.

- Home OS baseline: `origin/main` at `6c9921493230fb69d557d5f9c2a42d4f534ea8d3`.
- Corresponding Navet tree baseline: upstream 0.15.1 at `fbdc437e948a3523e3ecd6acb673896140b73dd4`.
- Important: the published Home OS main branch has rewritten root history and no Git merge base with upstream. Compare trees directly until ancestry is repaired.

## Existing modified upstream surfaces

- Dashboard router and navigation: currently high conflict; V2 will remove duplicate destinations and leave only registry composition seams.
- Settings: currently only branded by replacing a group label; V2 requires one Home OS settings registration point.
- Locales: Home OS 1.0 added keys to every language file; V2 should isolate Home OS messages and provide English fallback rather than forcing broad upstream edits for every feature.
- Root package/lockfile: retained only for real dependencies and scripts.
- Standalone HTML, PWA manifest/assets, Dockerfile, Compose, and workflow: intentional product/deployment fork surfaces.
- Sidebar logo: intentional branding seam, kept small.

## V2 policy

1. New semantic, adapter, alert, card, and page code stays under `features/home-os`.
2. A new Home OS card must not require a router change.
3. A new Home OS detail page must register through one route registry.
4. Shared UI must consume provider-neutral models and commands.
5. Upstream files changed by V2 are listed here with a reason and migration note.
6. Before an upstream sync, compare the target upstream tree against the recorded baseline and replay the smallest Home OS integration patches.

## Required V2 integration seams

This table is updated as implementation lands.

| Upstream file | Reason | Constraint |
|---|---|---|
| `features/dashboard/components/add-card-dialog/*` | Read Home OS card definitions | One registry map; no per-card router branches |
| `features/dashboard/components/widget-card.tsx` | Render Home OS card instances | One lazy delegated renderer |
| `features/dashboard/stores/custom-cards-store.ts` | Persist `home-os` card instances | One card type; kind stays in registry data |
| `features/settings/components/settings-section.tsx` | Expose mapping/configuration | One Home OS settings tab |
| `features/dashboard/components/dashboard-section-router.tsx` | Open Homelab detail | One detail branch; fixed Home strip and duplicate routes removed |
| `components/layout/section-navigation.ts` | Expose Homelab detail | Native Navet destinations retained; only Homelab is added |
| Docker/nginx runtime | Persist `/data/home-os/config.json` | Authenticated same-origin writes; no payload logging |
