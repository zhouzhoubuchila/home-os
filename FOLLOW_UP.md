# Follow-up

## Existing repository-wide i18n debt

`pnpm check:i18n` still reports 78 pre-existing findings outside Home OS V2.0.3.3, concentrated in the Energy dashboard and dashboard editing UI. V2.0.3.3 adds no new findings; its display-state, weather-condition, unit, freshness, and diagnostics strings remain inside the existing Home OS localization/display formatting layers.

This debt remains outside the V2.0.3.3 semantic compatibility and real-environment hotfix scope.
