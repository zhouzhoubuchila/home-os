import { useEffectiveEffectsQuality } from '@navet/app/components/shared/theme/effective-effects-quality';
import { useSettingsStore } from '@navet/app/stores/settings-store';

export function useLunarLifeMotion(): 'high' | 'medium' | 'low' | 'off' {
  const quality = useEffectiveEffectsQuality();
  const disabled = useSettingsStore((state) => state.disableAnimations);
  const lowPower = useSettingsStore((state) => state.lowPowerMode);
  if (disabled) return 'off';
  return lowPower ? 'low' : quality;
}
