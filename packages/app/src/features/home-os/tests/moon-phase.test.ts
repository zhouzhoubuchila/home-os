import { describe, expect, it } from 'vitest';
import { getMoonPhase } from '../astronomy/moon-phase';

describe('moon phase', () => {
  it('recognizes the April 2024 solar-eclipse new moon', () => {
    const phase = getMoonPhase(new Date('2024-04-08T18:21:00.000Z'));
    expect(phase.name.en).toBe('New moon');
    expect(phase.illumination).toBeLessThan(0.02);
  });

  it('returns a bounded age and illumination for arbitrary dates', () => {
    const phase = getMoonPhase(new Date('2026-09-01T12:00:00.000Z'));
    expect(phase.age).toBeGreaterThanOrEqual(0);
    expect(phase.age).toBeLessThan(29.531);
    expect(phase.illumination).toBeGreaterThanOrEqual(0);
    expect(phase.illumination).toBeLessThanOrEqual(1);
  });
});
