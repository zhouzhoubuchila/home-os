# Navet reuse matrix — Home OS V2.0.3.4

Audited against canonical `awesomestvi/navet` main at `a25d85acbd362f7381b06d78cd0fae26cdaf2eb8`.

| Home OS surface | Navet source reused | Decision |
| --- | --- | --- |
| Lighting | `features/lighting/components/light-card`, dashboard action conventions | Reuse controls and provider commands; Home OS adds only the circuit semantic adapter. |
| PVE summary | `BaseCard`, `CompactMeterListItem`, theme surface tokens | Reuse directly; no feature-local gauge. |
| PVE history | Provider history/recorder service | Render only recorded history; no synthetic series. |
| Astronomy shell | `BaseCard`, theme tokens, reduced-motion conventions | Reuse shell; source-level Sun calculations are pinned separately. |
| Security cameras | `features/security/components/camera-card` pipeline | Reuse stream/snapshot/go2rtc selection; semantic layer only filters roles and duplicates. |
| Media | `features/media/components/media-dashboard` and media-card controller | Reuse browse/playback capability handling and physical-device grouping. |
| Empty/error states | `CardEmptyState`, `MessageBar`, existing localized media states | Reuse copy and interaction patterns. |
| Themes/responsive | Navet `glass`, `dark`, `light`, `black` tokens and card grammar | No fifth theme and no Home OS-only radius/motion system. |

No upstream merge or rebase is performed because the product fork carries intentional deployment and Home OS seams. Reuse is source-level and component-level at stable provider-neutral boundaries.
