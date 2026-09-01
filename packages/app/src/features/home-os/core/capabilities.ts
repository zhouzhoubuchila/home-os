import type { NavetCapabilityId } from '@navet/core/capabilities';

export const hasCapability = (
  capabilities: readonly NavetCapabilityId[],
  capability: NavetCapabilityId
) => capabilities.includes(capability);

export const uniqueCapabilities = (capabilities: readonly NavetCapabilityId[]) => [
  ...new Set(capabilities),
];
