# Follow-up

## Existing repository-wide i18n debt

`pnpm check:i18n` still reports 78 pre-existing findings outside Home OS V2.0.3.2, concentrated in the Energy dashboard and dashboard editing UI. V2.0.3.2 adds no new findings; its Chinese display-state and diagnostics strings are fully routed through the existing localization layers.

This debt is intentionally deferred because the V2.0.3.2 scope guard only permits fixes strongly related to Home OS data binding, resolution, semantic identity, localization, and Sun/Moon integration.
