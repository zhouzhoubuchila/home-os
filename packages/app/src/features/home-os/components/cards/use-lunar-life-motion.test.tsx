import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLunarLifeMotion } from './use-lunar-life-motion';

afterEach(() => {
  useSettingsStore.setState({ disableAnimations: false, lowPowerMode: false });
  delete document.documentElement.dataset.effectsQuality;
});

describe('Lunar family motion quality', () => {
  it('follows effective quality and drops to low in low-power mode', () => {
    document.documentElement.dataset.effectsQuality = 'medium';
    const { result, rerender } = renderHook(() => useLunarLifeMotion());
    expect(result.current).toBe('medium');
    useSettingsStore.setState({ lowPowerMode: true });
    rerender();
    expect(result.current).toBe('low');
  });

  it('becomes static when animations are disabled', () => {
    useSettingsStore.setState({ disableAnimations: true });
    const { result } = renderHook(() => useLunarLifeMotion());
    expect(result.current).toBe('off');
  });
});
