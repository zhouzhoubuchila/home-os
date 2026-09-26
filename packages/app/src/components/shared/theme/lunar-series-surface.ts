/** Motion priority is a presentation policy, not a change to card data or composition. */
export function getHomeOsMotionTier(kind: string | undefined): 'A' | 'B' | 'C' | undefined {
  if (kind === 'lunar' || kind === 'weather') return 'A';
  if (
    kind &&
    [
      'household',
      'modes',
      'lighting',
      'calendar',
      'alerts',
      'media-stack',
      'cleaning',
      'battery',
    ].includes(kind)
  )
    return 'B';
  if (kind && ['internet', 'router', 'home-assistant', 'pve', 'electricity', 'gas'].includes(kind))
    return 'C';
  return undefined;
}
