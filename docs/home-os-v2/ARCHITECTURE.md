# Home OS V2 architecture

## Boundaries

- `@navet/core` continues to own provider-neutral runtime contracts. Home OS does not widen the provider contract to mirror Home Assistant.
- Provider packages continue to own raw payload mapping, transport, authentication, subscriptions, and command translation.
- `@navet/app/features/home-os` owns product semantics, configuration, adapters, cards, pages, and thin composition hooks.
- Shared Home OS UI consumes semantic view models and generic actions, never raw Home Assistant service payloads.

## Data flow

```text
Provider state
  -> NavetEntity / current app compatibility device
  -> HomeOsEntityInput
  -> semantic candidate classification
  -> stable-ref manual override resolution
  -> final semantic mapping
  -> family/light/physical-device/alert adapters
  -> cards and detail pages
```

Resolution order is manual override, explicit Home OS metadata, registry metadata, device/area/device-class metadata, integration metadata, domain, name heuristic, and regex fallback. Every candidate records confidence and reasons. Low-confidence candidates are reviewable and are not promoted to primary UI by default.

## Configuration

The document has a required `schemaVersion`, mappings, physical-device assignments, alert rules, card preferences, and timestamps. Reads validate and migrate before use. Writes go through one repository that provides optimistic concurrency, backup-before-migration/import, export allowlisting, reset, and recovery from an invalid primary file.

Standalone and add-on deployments persist the document under `/data`. Browser-only storage may cache the latest safe snapshot for resilience but is never the durable source of truth.

## Extension model

An extension definition declares its semantic roles, cards, pages, and provider/history/control requirements. It does not discover entities itself. Card definitions are exposed to Navet's Add Card and layout system through one registry seam. Detail routes are exposed through one route registry seam.

## Interaction and safety

Controls are shown only when the owning entity/provider advertises the required capability. Safe commands may use reversible optimistic state while awaiting provider confirmation. Confirm and dangerous commands require explicit confirmation. Failures roll back visual state and preserve the latest provider truth.

## UI references

Home is the reference for dashboard rhythm and density. Existing Navet card primitives, card shells, settings navigation, dialogs, and dashboard editor are reused. Home OS introduces no second page shell or dashboard editor. Cards prioritize identity, current state, key metric, freshness, exception, then action, and intentionally adapt at small, medium, and large sizes.

## Compatibility

The legacy Home OS 1.0 regex model and monolithic section module were removed after every active caller migrated. Configuration migrations are forward-only and the durable store preserves the previous valid document before every mutation for rollback.
