# Home OS V2 operations

## Persistent data

The standalone image and Home Assistant add-on store Home OS configuration at `/data/home-os/config.json`. The prior valid document is retained at `/data/home-os/config.backup.json`. Docker and Compose must mount `/data`; rebuilding or replacing the container then preserves mappings, physical-device assignments, alert rules, and card preferences.

The browser sends authenticated same-origin requests to `/__home_os__/config`. Mutations require the current revision and are rejected with HTTP 409 when another client has already written a newer revision. Request bodies and credentials are never logged.

## Upgrade

1. Export Home OS configuration from Settings → Home OS.
2. Pull the desired immutable image tag or digest.
3. Keep the existing `/data` volume attached and replace the container.
4. Verify Settings → About shows Home OS V2.0.0 and the expected build SHA/date.
5. Open Settings → Home OS and confirm the revision, mappings, and recovery banner state.

Schema v1 configuration is migrated to schema v2 when read. Unsupported or malformed primary data is not silently accepted; a valid backup is recovered when available.

## Rollback

1. Stop the current container without deleting its `/data` volume.
2. Start the previous known-good image tag or digest with the same volume.
3. If a V2 configuration must be restored manually, import the pre-upgrade export after returning to V2. Do not edit the JSON in place while the service is running.

Home OS V2 does not modify Home Assistant configuration, entities, credentials, or integrations, so application rollback does not require an HA rollback.

## Failure recovery

- HTTP 401: the Navet installation session is missing or expired; sign in again.
- HTTP 403: the mutation was not same-origin; use the served Home OS UI.
- HTTP 409: reload mappings, review the newer revision, and reapply the change.
- HTTP 503: verify `/data` is writable by nginx and that the volume is mounted.
- Backup recovery banner: export the recovered configuration, inspect storage health, then save once to establish a new primary document.

## Runtime verification

The container health endpoint remains `/`. Release images are built for `linux/amd64` and `linux/arm64` by `.github/workflows/home-os-image.yml`. Build metadata is injected by the image workflow and displayed in Settings → About so stale PWA assets can be distinguished from a newly deployed image.
