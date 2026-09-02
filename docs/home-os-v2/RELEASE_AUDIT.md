# Home OS V2.0.3.5 release audit

Audited from `codex/home-os-v2.0.3.5`, based on `origin/main` at `58bc0d3bc6293e108891b33c3ac97798c4821859`. This audit distinguishes executable tests from actual product-path consumption.

## Required final report

1. **PRODUCT_PATH_AUDIT:** PASS — `PRODUCT_PATH_AUDIT_V2035.md` traces provider state through normalization, semantics, functional projection, native page/card and final DOM.
2. **NAVET_RECIPE_MATRIX:** PASS — `NAVET_RECIPE_MATRIX_V2035.md` records complete recipes and ownership boundaries.
3. **Lighting actual page path:** PASS — provider entities → semantic resolver → light circuit builder → product projection → `LightsDashboard` → native `LightCard`/explicit unavailable row.
4. **Security actual page path:** PASS — semantic exclusion/projection runs before the real security model, alert count, camera dashboard and timeline inputs.
5. **Media actual page path:** PASS — physical projection runs before `MediaDashboard` and section grids; browser capability absence and request error remain distinct.
6. **PVE primary recipe:** PASS — native UPS-style multi-metric infrastructure monitor.
7. **Exact PVE components reused:** `BaseCard`, `EntityCardHeader`, `EntityCardHeaderIcon`, `CardMetric`, `CardEmptyState`, `BaseCardDialogWithState`, `CardDialogSection`, `SelectableCheckboxRow`, `Select`, and native tint/theme surfaces.
8. **PVE responsive result:** PASS — small shows at most 2 metrics, medium 4/two columns, large 6/three columns; all three render the same live physical device model.
9. **Astronomy pinned upstream SHA:** `730a1e145e064a0ccc885c795f74c81d61859a28` from `jayjojayson/Sun-Position-Card`.
10. **Astronomy source files ported:** exact 10 upstream `src/*.js` files, MIT `LICENSE`, and 15 original PNG assets; source hashes were compared to the pinned checkout.
11. **No homemade Moon geometry:** PASS — the shipped view contains no custom SVG/ellipse Moon path and selects pinned upstream imagery. A missing Moon entity is `unavailable`, not locally estimated.
12. **`sun.sun` final path:** normalized provider entity → astronomy projection → `HomeOsHassFacade` → live rise/set, azimuth, elevation and upstream image selection → lunar card/detail DOM.
13. **Dashboard Section 1:** PASS — only the schema-v1, single generated `Section 1` with all cards assigned migrates back to flow; current or intentional sections are preserved. New titles are localized.
14. **Page-level i18n:** PASS for changed product paths — display-state/weather normalization tests and Chinese astronomy fixture do not expose raw provider values; Security/Media continue to use Navet translations. The repository-wide checker still reports the unchanged 78 pre-existing Dashboard/Energy findings.
15. **Product-path integration tests:** PASS — 8 files, 69 tests.
16. **Test status:** PASS — Tier 1: 50 files/658 tests; Tier 2: 22/155; Tier 3: 487/3,088.
17. **Product-path status:** PASS — Lighting, Security/Camera, Media, PVE, Astronomy and Dashboard consumers all read the new projection or migration seam.
18. **Four-theme result:** PASS — glass, dark, light and black stories compile.
19. **Responsive result:** PASS — narrow-touch story plus PVE size matrix; no fixed oversized empty shell.
20. **Build/bundle result:** PASS — standalone 3,059 modules, 158 JavaScript files syntax-checked; Storybook 3,427 modules; eager JS 701.9 KB and authenticated transition JS 138.2 KB within budget.
21. **PR:** filled after GitHub creation; CI is required before merge.
22. **Main SHA:** filled by the merge result and reported in delivery output.
23. **GHCR tag:** `ghcr.io/zhouzhoubuchila/home-os:v2.0.3.5`.
24. **Immutable image:** `ghcr.io/zhouzhoubuchila/home-os:sha-<merge-sha>` after the main workflow completes.

## Gate evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | PASS | `pnpm typecheck` |
| Biome | PASS | 1,980 files; exact third-party snapshot excluded from source rewriting |
| Tier 1 | PASS | 50 files, 658 tests |
| Tier 2 | PASS | 22 files, 155 tests |
| Tier 3 | PASS | 487 files, 3,088 tests |
| Product path | PASS | 8 files, 69 tests |
| Story standards | PASS | 183 story files |
| Four themes/mobile | PASS | V2.0.3.5 Product Path Matrix story |
| Standalone build | PASS | 3,059 modules; 158 generated JavaScript files syntax-checked |
| Storybook build | PASS | 3,427 modules; V2.0.3.5 story emitted |
| Bundle budget | PASS | eager 701.9 KB; authenticated transition 138.2 KB |
| UI-kit boundary | PASS | no violations |
| Lockfile/supply chain | PASS | metadata and policy checks |
| Release surfaces | PASS | root 0.15.1 surfaces aligned; Home OS image version 2.0.3.5 |
| Real-device access | NOT RUN | Explicitly prohibited; no HA, PVE, router, camera, media or Docker port 8082 access |

## Known repository baselines

- `check:i18n`: 78 pre-existing Energy/Dashboard findings, unchanged in count and outside the V2.0.3.5 product-path files.
- `check:provider-boundaries`: 16 pre-existing app compatibility escapes, none in the changed Home OS product-path files.
- The root `pnpm build`/`pnpm build:storybook` wrappers hit a Windows argument/volume-label problem in the runtime shell. The exact underlying workspace commands passed and are the authoritative build evidence.

## Decision

The semantic contract, functional projection, actual Navet page consumption, native recipes, page-level integration tests, four-theme story, responsive composition and provider-like real-environment logic all pass. Delivery becomes **READY FOR DELIVERY** after PR checks, merge, and both GHCR tags are verified.
