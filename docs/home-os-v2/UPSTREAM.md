# Navet upstream compatibility

## Baseline

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
| Dashboard Add Card composition | Read Home OS card definitions | One registry hook; no per-card imports |
| Dashboard card renderer | Render registered Home OS card instances | One delegated renderer |
| Settings composition | Expose Home OS mapping/configuration | One settings tab registration |
| Optional section router | Resolve registered Home OS detail routes | One delegated route lookup |
| Docker nginx config | Persist `/data` Home OS configuration | Same-origin authorization; no secret logging |

