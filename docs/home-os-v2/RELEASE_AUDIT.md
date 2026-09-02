# Home OS V2.0.3.4 release audit

Audited on 2026-09-03 from `codex/home-os-v2.0.3.4`, based on `origin/main` at `2ac988a3c7c5ecacbebffbea8f2b237f9a11bb63` and compared with canonical Navet at `a25d85acbd362f7381b06d78cd0fae26cdaf2eb8`.

## Architecture and behavior

- The final lighting circuit contract separates state source, actions, source entities, state quality and classification. Buttons are action-only; unknown is neither on nor off; whole-home-off is household-lighting only.
- PVE mapping exposes the exact V2.0.3.4 role set with type/unit compatibility. Homepage KPIs are CPU usage, temperature, memory usage, storage usage and uptime. Model, kernel, KSM and capacity remain detail data.
- PVE meters reuse Navet `CompactMeterListItem`; no Home OS gauge or fabricated history was added.
- Astronomy retains the pinned MIT Sun Position Card source adaptation and thin `HomeOsHassFacade`. Only the Sun occupies the solar arc; the Moon is a separate phase disc.
- Refrigerator/freezer/ice-maker door and child-lock semantics route to appliance roles, not Security.
- Existing Navet camera and media pipelines remain authoritative. Vacuum maps are excluded from Security, physical camera sources are deduplicated, idle media is not labeled as currently playing, and browse absence is a capability state.
- Chinese placeholder media section titles were removed. Existing display-state and weather/unit normalization remains presentation-only.

## Verification matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript | PASS | `tsc --noEmit` |
| Biome lint | PASS | 1,974 files; no warnings after final formatting |
| Home OS/security/media scope | PASS | 18 files, 145 tests; V2.0.3.4 contract file has 26 tests |
| Tier 1 | PASS | 50 files, 658 tests |
| Tier 2 | PASS | 22 files, 155 tests |
| Tier 3 / repository unit suite | PASS | 485 files, 3,077 tests |
| Storybook standards | PASS | 183 story files |
| Storybook production compile | PASS | 3,424 modules; V2.0.3.4 story emitted as a standalone chunk |
| Standalone production build | PASS | 3,056 modules, PWA 33 precache entries, 159 JavaScript files syntax-checked |
| Bundle budget | PASS | eager JavaScript 701.9 KB; authenticated transition JavaScript 138.3 KB |
| UI-kit boundary | PASS | no boundary violations |
| Lockfile/supply-chain | PASS | metadata aligned and policy check passed |
| Release surfaces | PASS | Navet root release surfaces remain aligned for 0.15.1; Home OS image workflow is 2.0.3.4 |
| Real device access | NOT RUN | Explicitly prohibited; no HA/PVE/router/camera/media/8082 access occurred |

## Known upstream baseline diagnostics

- `check:i18n` still reports the same 78 pre-existing Dashboard/Energy findings. V2.0.3.4 adds no Home OS finding and removes the visible Chinese media placeholders.
- `check:provider-boundaries` still reports the existing 16 app-owned compatibility escapes outside this change; none is in Home OS or a file changed for V2.0.3.4.
- The Storybook/Vitest browser runner currently indexes all 183 stories as zero-test files and exits with `No test suite found`. This is repository-wide addon/Vitest configuration debt, not a story render or compile failure. The browser dependency is installed, Storybook standards pass, and the full Storybook production compilation succeeds.

## Release and rollback

- Release tag: `ghcr.io/zhouzhoubuchila/home-os:v2.0.3.4`.
- Immutable tag: `ghcr.io/zhouzhoubuchila/home-os:sha-<merge-sha>`.
- Previous tags remain untouched. Rollback uses the prior immutable or V2.0.3.3 tag documented in `OPERATIONS.md`.
- Real-device verification gaps are listed in `REAL_ENVIRONMENT_GAPS_V2034.md` and are not represented as CI coverage.

## Decision

**READY FOR DELIVERY**, subject only to GitHub Actions publishing the multi-architecture image and reporting its immutable digest. All product-code, semantic-contract, unit, tier, compile and bundle gates pass. The repository-wide Storybook runner, i18n and provider-boundary baselines are explicitly disclosed rather than hidden.
