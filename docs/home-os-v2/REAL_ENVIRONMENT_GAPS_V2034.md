# Real-environment gaps — V2.0.3.4

This release was verified without connecting to the user's Home Assistant, Proxmox, router, cameras, media players, or port 8082.

## Closed from the supplied real-environment report

- Lighting buttons are action-only; unknown state is not counted as off or on.
- Whole-home-off targets only `household_lighting` circuits.
- PVE uses exact roles and numeric/string compatibility; model, kernel, KSM and capacity remain detail data.
- Sun and Moon are separate visuals; only the Sun occupies the solar arc.
- Refrigerator/freezer door and child-lock entities use appliance roles.
- Vacuum map cameras remain outside Security; physical camera duplicates collapse.
- Idle media entities are not labeled as currently playing; unsupported browsing has a capability-specific message.
- Chinese placeholder section titles are removed.

## Honest remaining real-device checks

- Confirm the exact entity registry `device_id`, `area_id`, units and integration metadata emitted by the user's PVE and appliance integrations.
- Confirm camera stream negotiation and authentication against the user's go2rtc/Home Assistant deployment.
- Confirm media browse capability flags and provider error payloads on each real player.
- Confirm wall-display touch density and all four themes on the target screen.
- Confirm the published multi-architecture image on the user's deployment host after pulling the immutable digest.

These checks require real credentials or devices and are not represented as completed by fixture, CI, or Storybook evidence.
