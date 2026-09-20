import type { ThemeType } from '@navet/app/hooks/use-theme';
import { useEffect, useState } from 'react';
import {
  LUNAR_BACKGROUND_ASSETS,
  LUNAR_BACKGROUND_CONFIG,
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
    const config = LUNAR_BACKGROUND_CONFIG[item];
    const opacity = theme === 'light' ? config.opacity * 0.08 : config.opacity;
    return (
      <img
        key={item}
        src={LUNAR_BACKGROUND_ASSETS[item]}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[420ms] ease-out motion-reduce:transition-none"
        style={{
          objectPosition: config.position,
          opacity: active ? opacity : 0,
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
            'linear-gradient(90deg, rgb(4 7 16 / 0.12) 0%, rgb(4 7 16 / 0.24) 38%, rgb(4 7 16 / 0.58) 70%, rgb(4 7 16 / 0.72) 100%)',
          opacity: theme === 'light' ? 0.12 : 1,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
