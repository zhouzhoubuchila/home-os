export const AUTO_ACCEPT_CONFIDENCE = 0.9;
export const REVIEW_CONFIDENCE = 0.6;

export const clampConfidence = (value: number) => Math.max(0, Math.min(1, value));

export const needsMappingReview = (confidence: number, hasRoles: boolean) =>
  !hasRoles || confidence < AUTO_ACCEPT_CONFIDENCE;

const IMPORTANT_REVIEW_PREFIXES = [
  'lighting.',
  'family.',
  'energy.',
  'homelab.',
  'security.',
  'environment.',
  'appliance.',
  'device.',
];

export function shouldSurfaceMappingReview({
  confidence,
  roles,
  diagnostic,
}: {
  confidence: number;
  roles: readonly string[];
  diagnostic: boolean;
}) {
  if (diagnostic) return false;
  if (!roles.length) return false;
  return (
    confidence < AUTO_ACCEPT_CONFIDENCE &&
    confidence >= REVIEW_CONFIDENCE &&
    roles.some((role) => IMPORTANT_REVIEW_PREFIXES.some((prefix) => role.startsWith(prefix)))
  );
}
