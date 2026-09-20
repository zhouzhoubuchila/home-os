import type { ThemeType } from '@navet/app/hooks/use-theme';
import { useEffect, useState } from 'react';
import {
  getLunarBackgroundConfig,
  LUNAR_BACKGROUND_ASSETS,
  type LunarBackgroundVariant,
} from './lunar-background-assets';

export function LunarBackground({
  variant,
  theme,
  section,
}: {
  variant: LunarBackgroundVariant;
  theme: ThemeType;
  section: string;
}) {
  const [visible, setVisible] = useState(variant);
  const [previous, setPrevious] = useState<LunarBackgroundVariant>('none');
  const [crossfade, setCrossfade] = useState(true);

  useEffect(() => {
    if (variant === visible) return;
    setPrevious(visible);
    setVisible(variant);
    setCrossfade(false);
    const frame = window.requestAnimationFrame(() => setCrossfade(true));
    const timer = window.setTimeout(() => {
      setPrevious('none');
      setCrossfade(false);
    }, 460);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [variant, visible]);

  if (variant === 'none' && previous === 'none') return null;

  const renderLayer = (item: LunarBackgroundVariant, active: boolean) => {
    if (item === 'none') return null;
    const config = getLunarBackgroundConfig(item, theme === 'light' ? 'light' : 'dark');
    return (
      <img
        key={item}
        src={LUNAR_BACKGROUND_ASSETS[item]}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[420ms] ease-out motion-reduce:transition-none"
        style={{
          objectPosition: config.position,
          opacity: active ? config.opacity : 0,
          filter: config.filter,
        }}
        data-lunar-background-image={item}
      />
    );
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      data-lunar-background-variant={variant}
      data-lunar-background-section={section}
    >
      {renderLayer(previous, false)}
      {renderLayer(visible, crossfade)}
      <div
        className="absolute inset-0"
        style={{
          background:
            theme === 'light'
              ? 'transparent'
              : 'linear-gradient(90deg, rgb(3 6 14 / 0.06) 0%, rgb(3 6 14 / 0.16) 32%, rgb(3 6 14 / 0.46) 62%, rgb(3 6 14 / 0.70) 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            theme === 'light'
              ? 'inset 0 0 34px rgb(1 4 10 / 0.08)'
              : 'inset 0 0 34px rgb(1 4 10 / 0.28)',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
