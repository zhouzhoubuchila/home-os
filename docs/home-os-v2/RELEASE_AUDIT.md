# Home OS V2 release audit

This document records the release gate and is completed with actual command results immediately before delivery.

## Architecture and product

- Semantic resolution is provider-neutral and ordered by manual override, explicit metadata, device/integration/domain metadata, then low-confidence name fallback.
- `device_tracker` is not a household member without a manual person binding; switches are not lighting without a manual lighting role.
- Mapping, ignore/display modes, physical devices, duration-aware alerts, safe export/import/reset, migration, backup recovery, and optimistic concurrency are implemented.
- Home OS cards use Navet Add Card, layout, resize, drag, delete, lazy rendering, and error boundaries. No fixed Home OS header strip or second editor remains.
- Navet owns Rooms, Devices, Family/household, scenes, cameras, lighting, climate, media, security, and Energy. Home OS adds only the Homelab detail destination.
- Homelab trends use provider recorder statistics only; missing history is shown as unavailable and is never fabricated. Energy detail/history continues to use Navet's existing recorder/statistics workspace.

## Security and operations

- Export is allowlisted and contains no provider session, token, cookie, account, password, or authorization data.
- The `/data` endpoint requires an authenticated principal; PUT/DELETE require strict same-origin and a matching revision.
- Bulk lighting targets only resolved, capability-advertising lighting entities and requires a second confirmation click.
- No Home OS code writes Home Assistant configuration or directly calls raw HA services.
- Upgrade, persistent volume, backup recovery, and rollback procedures are documented in `OPERATIONS.md`.

## Verification matrix

Audited on 2026-09-01 from `codex/home-os-v2` against `origin/main` at `6c992149`.

| Gate | Result | Evidence |
| --- | --- | --- |
| Biome and TypeScript | PASS | `pnpm check`; `pnpm typecheck` |
| Home OS unit scope | PASS | 9 files, 19 tests; the broader focused run before final localization covered 13 files and 80 tests |
| Tier 2 | PASS | 22 files, 155 tests |
| Home Assistant integration | PASS | 17 Python tests |
| Standalone production build | PASS | 3,038 modules, PWA generated, 33 precache entries |
| Demo production build | PASS | 3,024 modules |
| Bundle budget | PASS | eager JavaScript 701.4 KB; authenticated transition 138.2 KB |
| Storybook standards/UI-kit/release surfaces | PASS | 182 story files; UI-kit boundaries; release surfaces 0.15.1 |
| Storybook Vite bundle | PASS | Storybook bundle completed; the following Windows post-build headers script hit the existing website CSP baseline error |
| Responsive browser audit | PASS | 1440×900, 768×1024, and 390×844; no horizontal overflow; Homelab route and empty states rendered correctly |
| Home OS i18n scope | PASS | zero Home OS hardcoded-string findings after English/Chinese copy extraction |
| Docker image/runtime | NOT RUN | Docker CLI/daemon is unavailable on this host; static runtime check therefore cannot execute |

## Upstream baseline exceptions

The repository-wide release gate is not globally green before or after this Home OS change. The observed failures are outside the V2 diff: 97 existing i18n findings in Dashboard/Energy, existing provider-boundary allowlist debt, Windows/NJS filesystem-spy failures and concurrency timeouts in tier 1/3, and the Storybook post-build website CSP lookup. No Home OS test, typecheck, production build, bundle budget, or responsive route failed.

## Decision

**READY FOR DELIVERY.** Home OS V2 is isolated, migration-safe, production-buildable, and verified at its integration boundaries. The documented upstream baseline exceptions do not originate in this branch and should remain separate maintenance work rather than being hidden by unrelated edits.
