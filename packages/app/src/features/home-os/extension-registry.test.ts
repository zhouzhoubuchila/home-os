import { describe, expect, it } from 'vitest';
import { getHomeOsExtension } from './extension-registry';

describe('Home OS extension registry', () => {
  it('declares cards, semantic roles, and provider requirements without matching entities', () => {
    const homelab = getHomeOsExtension('homelab');
    expect(homelab?.cards).toContain('home-os.pve');
    expect(homelab?.semanticRoles.optional).toContain('homelab.*');
    expect(homelab).not.toHaveProperty('entityMatches');
  });
});
