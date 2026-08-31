export const AUTO_ACCEPT_CONFIDENCE = 0.9;
export const REVIEW_CONFIDENCE = 0.6;

export const clampConfidence = (value: number) => Math.max(0, Math.min(1, value));

export const needsMappingReview = (confidence: number, hasRoles: boolean) =>
  !hasRoles || confidence < AUTO_ACCEPT_CONFIDENCE;
