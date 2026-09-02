# Navet test matrix — Home OS V2.0.3.4

| Concern | Trusted Navet coverage | Home OS V2.0.3.4 addition |
| --- | --- | --- |
| Light controls | Light Card controller/action tests and stories | Real-device circuit tests: native light, switch, binary state, action-only button, unknown state, exclusions. |
| PVE presentation | `BaseCard` and `CompactMeterListItem` primitive stories/tests | Exact role, unit/type, missing/unavailable/malformed, KPI/detail split tests. |
| Astronomy | Shared card/theme/reduced-motion standards | Pinned Sun Position Card calculation tests; separate Moon disc and waning-gibbous visual contract. |
| Security cameras | Camera card stream/snapshot/go2rtc tests and Security stories | Semantic role, vacuum-map exclusion and physical-source dedup tests. |
| Media | Media card/dashboard/browse tests and stories | Capability-absent copy, request-failure separation, idle-not-current, physical output targeting. |
| i18n | Repository i18n diagnostics | Chinese section placeholder removal; weather/state/unit display tests. |
| Responsive/themes | Storybook viewports and Navet theme stories | V2.0.3.4 contract story renders all four theme families and narrow/wide surfaces. |

The upstream Tier-4 rewrite list remains non-authoritative on its own. Delivery requires current Home OS fixtures plus relevant Tier 1–3 and Storybook/build gates.
