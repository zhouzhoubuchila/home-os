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

Audited on 2026-09-02 from `codex/home-os-v2.0.3.3` against `origin/main` at `7161cf8c`.

| Gate | Result | Evidence |
| --- | --- | --- |
| Biome lint and TypeScript | PASS | 1,971 files linted; `tsc --noEmit` |
| Home OS + Security semantic scope | PASS | 16 files, 103 tests |
| Repository unit suite | PASS | 484 files, 3,051 tests |
| Standalone production build | PASS | 3,056 modules, PWA generated, 33 precache entries; 159 built JavaScript files passed syntax validation |
| Bundle budget | PASS | eager JavaScript 701.9 KB; authenticated transition JavaScript 138.3 KB |
| V2.0.3.3 fixture matrix | PASS | PVE temperature/DIMM/voltage/load; router WAN IPv4; light circuit and negative button; camera map/dedup; media statuses; display formatting |
| Sun/Moon source adaptation | PASS | pinned MIT upstream, thin `HomeOsHassFacade`, sun/night arcs, daylight fallback, entity moon and SVG animation retained |
| Recorder trend integrity | PASS | existing Recorder-backed `TrendSparkline` is rendered only when statistics history exists |
| Home OS i18n scope | PASS | Good/idle/state aliases, clear-night, Celsius and spaced weather units covered without adding hardcoded dashboard strings |
| GHCR multi-architecture image | PENDING CI | `Home OS image` publishes `main`, `v2.0.3.3`, and immutable `sha-*` after merge |

## Upstream baseline exceptions

The repository-wide diagnostic checks retain two known `main`-branch baselines outside this hotfix: 78 i18n findings concentrated in Dashboard/Energy and the existing provider-boundary allowlist debt. V2.0.3.3 adds no findings to either list. No Home OS test, TypeScript check, lint, production build, or bundle budget failed.

## Decision

**READY FOR DELIVERY.** Home OS V2 is isolated, migration-safe, production-buildable, and verified at its integration boundaries. The documented upstream baseline exceptions do not originate in this branch and should remain separate maintenance work rather than being hidden by unrelated edits.
