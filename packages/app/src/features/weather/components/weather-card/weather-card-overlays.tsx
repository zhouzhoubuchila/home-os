import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { ThemeType } from '@navet/app/hooks';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import type { CSSProperties, ReactNode } from 'react';
import { FogOverlaySvg } from './fog-overlay';
import { PassageWaveOverlaySvg } from './passage-wave-overlay';
import { RainOverlaySvg } from './rain-overlay';
import { SnowflakeOverlaySvg } from './snowflake-overlay';
import { StormLightningOverlaySvg } from './storm-lightning-overlay';
import { getWeatherBackgroundVariant } from './weather-card-utils';
import type { WeatherCondition } from './weather-icon';
import { WindOverlaySvg } from './wind-overlay';

// ─── Theme surface helpers ───────────────────────────────────────────────────

function pickThemeValue<T>(theme: ThemeType, values: { light: T; glass: T; dark: T; black: T }): T {
  if (theme === 'glass') {
    return values.glass;
  }

  if (theme === 'black') {
    return values.black;
  }

  if (theme === 'dark') {
    return values.dark;
  }

  return values.light;
}

interface WeatherThemeSurface {
  baseGradient: string;
  themeSurfaceClassName: string | null;
  darkThemeScrim: React.ReactNode;
}

function getWeatherThemeSurface(theme: ThemeType, variant: string): WeatherThemeSurface {
  // Base gradient
  const baseGradient = pickThemeValue(theme, {
    light: getLightGradient(variant),
    glass: getGlassGradient(variant),
    dark: getDarkGradient(variant),
    black: getBlackGradient(variant),
  });

  // Theme surface className
  const themeSurfaceClassName = getThemeSurfaceClassName(theme, variant);

  // Dark theme scrim
  const darkThemeScrim = getDarkThemeScrim(theme);

  return { baseGradient, themeSurfaceClassName, darkThemeScrim };
}

function getLightGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny: 'bg-[linear-gradient(135deg,#15294f_0%,#244276_48%,#304d86_100%)]',
    'clear-night': 'bg-[linear-gradient(135deg,#080f25_0%,#152a55_48%,#263a78_100%)]',
    cloudy: 'bg-[linear-gradient(135deg,#122a4b_0%,#1f416c_52%,#2d507f_100%)]',
    rain: 'bg-[linear-gradient(135deg,#09132d_0%,#16244d_46%,#24376a_100%)]',
    storm: 'bg-[linear-gradient(135deg,#070d21_0%,#111a3a_52%,#1c2854_100%)]',
    windy: 'bg-[linear-gradient(135deg,#10294b_0%,#214873_50%,#315988_100%)]',
    fog: 'bg-[linear-gradient(135deg,#172a45_0%,#304a68_52%,#46627e_100%)]',
    'snow-night': 'bg-[linear-gradient(135deg,#09132d_0%,#1a2f5b_48%,#2e4378_100%)]',
    'snow-day': 'bg-[linear-gradient(135deg,#1b3158_0%,#2e4b76_50%,#41628b_100%)]',
  };
  return gradients[variant] || 'bg-[linear-gradient(135deg,#122a4c_0%,#234873_52%,#345c8e_100%)]';
}

function getGlassGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny:
      'bg-[linear-gradient(135deg,rgba(9,18,43,0.58)_0%,rgba(34,66,118,0.54)_48%,rgba(62,78,142,0.48)_100%)]',
    'clear-night':
      'bg-[linear-gradient(135deg,rgba(5,10,27,0.62)_0%,rgba(20,40,82,0.56)_46%,rgba(42,60,119,0.48)_100%)]',
    cloudy:
      'bg-[linear-gradient(135deg,rgba(12,29,55,0.58)_0%,rgba(31,65,107,0.52)_52%,rgba(48,82,128,0.44)_100%)]',
    rain: 'bg-[linear-gradient(135deg,rgba(5,11,29,0.64)_0%,rgba(18,31,68,0.58)_46%,rgba(35,55,102,0.50)_100%)]',
    storm:
      'bg-[linear-gradient(135deg,rgba(4,8,23,0.68)_0%,rgba(14,22,49,0.60)_52%,rgba(27,39,80,0.50)_100%)]',
    windy:
      'bg-[linear-gradient(135deg,rgba(9,26,51,0.58)_0%,rgba(29,66,107,0.50)_50%,rgba(48,88,136,0.42)_100%)]',
    fog: 'bg-[linear-gradient(135deg,rgba(17,33,57,0.54)_0%,rgba(44,70,99,0.48)_52%,rgba(70,96,123,0.40)_100%)]',
    'snow-night':
      'bg-[linear-gradient(135deg,rgba(6,13,31,0.64)_0%,rgba(24,47,91,0.56)_48%,rgba(47,69,124,0.46)_100%)]',
    'snow-day':
      'bg-[linear-gradient(135deg,rgba(16,31,56,0.54)_0%,rgba(42,70,108,0.48)_50%,rgba(68,96,135,0.40)_100%)]',
  };
  return (
    gradients[variant] ||
    'bg-[linear-gradient(135deg,rgba(10,25,50,0.58)_0%,rgba(31,67,108,0.52)_52%,rgba(53,91,139,0.44)_100%)]'
  );
}

function getDarkGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny: 'bg-[linear-gradient(135deg,#101f40_0%,#1c3968_48%,#2e3c78_100%)]',
    'clear-night': 'bg-[linear-gradient(135deg,#060c20_0%,#10224a_46%,#1e3064_100%)]',
    cloudy: 'bg-[linear-gradient(135deg,#0d213e_0%,#1a385e_52%,#24466e_100%)]',
    rain: 'bg-[linear-gradient(135deg,#050b1f_0%,#111d42_46%,#1b2d5a_100%)]',
    storm: 'bg-[linear-gradient(135deg,#040819_0%,#0b1431_52%,#15234b_100%)]',
    windy: 'bg-[linear-gradient(135deg,#0b2341_0%,#193a62_50%,#285078_100%)]',
    fog: 'bg-[linear-gradient(135deg,#14283f_0%,#2b4865_52%,#3d5c77_100%)]',
    'snow-night': 'bg-[linear-gradient(135deg,#060d22_0%,#142951_48%,#263a70_100%)]',
    'snow-day': 'bg-[linear-gradient(135deg,#132846_0%,#29486f_50%,#3c5f86_100%)]',
  };
  return gradients[variant] || 'bg-[linear-gradient(135deg,#0c213f_0%,#1c3d65_52%,#2b527b_100%)]';
}

function getBlackGradient(variant: string): string {
  const gradients: Record<string, string> = {
    sunny: 'bg-[linear-gradient(135deg,#050b18_0%,#0d2340_48%,#151d46_100%)]',
    'clear-night': 'bg-[linear-gradient(135deg,#030711_0%,#09152f_46%,#101d42_100%)]',
    cloudy: 'bg-[linear-gradient(135deg,#050f1d_0%,#0b1e32_52%,#102941_100%)]',
    rain: 'bg-[linear-gradient(135deg,#02050f_0%,#071127_46%,#0d1c3b_100%)]',
    storm: 'bg-[linear-gradient(135deg,#01030a_0%,#050b1b_52%,#0b1531_100%)]',
    windy: 'bg-[linear-gradient(135deg,#040d1b_0%,#0a1e34_50%,#102a46_100%)]',
    fog: 'bg-[linear-gradient(135deg,#0b1624_0%,#14283a_52%,#1d374d_100%)]',
    'snow-night': 'bg-[linear-gradient(135deg,#030814_0%,#0b1938_48%,#152955_100%)]',
    'snow-day': 'bg-[linear-gradient(135deg,#0b1829_0%,#172d48_50%,#24425f_100%)]',
  };
  return gradients[variant] || 'bg-[linear-gradient(135deg,#040b18_0%,#0b2037_52%,#142b48_100%)]';
}

function getThemeSurfaceClassName(theme: ThemeType, variant: string): string | null {
  if (variant === 'sunny') {
    if (theme === 'glass') {
      return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,transparent_72%)]';
    }
    if (theme === 'black') {
      return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012)_28%,rgba(0,0,0,0.08)_100%)]';
    }
    if (theme === 'dark') {
      return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015)_28%,rgba(2,6,23,0.04)_100%)]';
    }
  }

  if (theme === 'glass') {
    return 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_34%,transparent_72%)]';
  }

  if (theme === 'black') {
    return 'bg-[linear-gradient(180deg,rgba(0,0,0,0.24),rgba(0,0,0,0.44)_100%)]';
  }

  if (theme === 'dark') {
    return 'bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.28)_100%)]';
  }

  return null;
}

function getDarkThemeScrim(theme: ThemeType): React.ReactNode {
  if (theme === 'black') {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.26),rgba(0,0,0,0.42)_100%)]" />
    );
  }

  if (theme === 'dark') {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.14),rgba(2,6,23,0.28)_100%)]" />
    );
  }

  return null;
}

function getSunnyThemeSurface(theme: ThemeType): {
  themeSurfaceClassName: string | null;
  darkThemeScrim: ReactNode;
} {
  if (theme === 'glass') {
    return {
      themeSurfaceClassName:
        'bg-[linear-gradient(180deg,rgba(210,232,255,0.12),rgba(255,255,255,0.025)_34%,transparent_72%)]',
      darkThemeScrim: null,
    };
  }

  if (theme === 'black') {
    return {
      themeSurfaceClassName:
        'bg-[linear-gradient(180deg,rgba(180,215,255,0.035),rgba(255,255,255,0.01)_28%,rgba(0,0,0,0.08)_100%)]',
      darkThemeScrim: (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.18)_100%)]" />
      ),
    };
  }

  if (theme === 'dark') {
    return {
      themeSurfaceClassName:
        'bg-[linear-gradient(180deg,rgba(190,220,255,0.045),rgba(255,255,255,0.015)_28%,rgba(2,6,23,0.04)_100%)]',
      darkThemeScrim: (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05),rgba(2,6,23,0.14)_100%)]" />
      ),
    };
  }

  return {
    themeSurfaceClassName:
      'bg-[linear-gradient(180deg,rgba(210,232,255,0.12),rgba(255,255,255,0.025)_34%,transparent_72%)]',
    darkThemeScrim: null,
  };
}

const WEATHER_ATMOSPHERE_KEYFRAMES = `
@keyframes navet-weather-atmosphere-drift {
  0%, 100% { transform: translate3d(-1.5%, 0, 0) scale(1.02); }
  50% { transform: translate3d(2%, -1%, 0) scale(1.05); }
}
@keyframes navet-weather-atmosphere-shimmer {
  0%, 100% { opacity: .16; transform: translate3d(-1%, 1%, 0); }
  50% { opacity: .28; transform: translate3d(1.5%, -1%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .navet-weather-atmosphere-drift,
  .navet-weather-atmosphere-shimmer { animation: none !important; }
}
`;

function getAtmospherePalette(theme: ThemeType, variant: string) {
  const isNight = variant === 'clear-night' || variant === 'snow-night';
  if (theme === 'light') {
    return isNight
      ? { haze: 'rgba(117,103,201,0.12)', flow: 'rgba(143,216,245,0.10)' }
      : { haze: 'rgba(120,185,235,0.14)', flow: 'rgba(117,103,201,0.08)' };
  }
  if (theme === 'black') {
    return isNight
      ? { haze: 'rgba(117,103,201,0.10)', flow: 'rgba(143,216,245,0.07)' }
      : { haze: 'rgba(79,127,210,0.09)', flow: 'rgba(117,103,201,0.07)' };
  }
  return isNight
    ? { haze: 'rgba(117,103,201,0.14)', flow: 'rgba(143,216,245,0.09)' }
    : { haze: 'rgba(79,127,210,0.12)', flow: 'rgba(117,103,201,0.08)' };
}

/** A quiet, air-like layer shared by weather conditions without changing layout. */
export function WeatherAtmosphere({
  condition,
  effectsQuality,
  size,
  theme,
}: {
  condition: WeatherCondition | string;
  effectsQuality: EffectsQuality;
  size: CardSize;
  theme: ThemeType;
}) {
  const variant = getWeatherBackgroundVariant(condition);
  const palette = getAtmospherePalette(theme, variant);
  if (size === 'tiny' || size === 'extra-small') return null;
  const opacity = size === 'large' || size === 'extra-large' || size === 'extra-wide' ? 1 : 0.78;
  const canAnimate = effectsQuality === 'high';
  const driftStyle = canAnimate
    ? ({ animation: 'navet-weather-atmosphere-drift 26s ease-in-out infinite' } as CSSProperties)
    : undefined;
  const shimmerStyle = canAnimate
    ? ({ animation: 'navet-weather-atmosphere-shimmer 18s ease-in-out infinite' } as CSSProperties)
    : undefined;

  return (
    <>
      <style data-weather-atmosphere-style>{WEATHER_ATMOSPHERE_KEYFRAMES}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
        data-weather-atmosphere={variant}
        data-weather-atmosphere-motion={canAnimate ? 'enabled' : 'static'}
        style={{ opacity }}
      >
        <div
          className={`${canAnimate ? 'navet-weather-atmosphere-drift' : ''} absolute -inset-[18%] rounded-[42%] blur-2xl`}
          style={{
            ...driftStyle,
            background: `radial-gradient(ellipse at 22% 42%, ${palette.haze}, transparent 54%), radial-gradient(ellipse at 80% 24%, ${palette.flow}, transparent 48%)`,
          }}
        />
        <div
          className={`${canAnimate ? 'navet-weather-atmosphere-shimmer' : ''} absolute -inset-[12%] opacity-35`}
          style={{
            ...shimmerStyle,
            background: `linear-gradient(118deg, transparent 16%, ${palette.flow} 45%, transparent 72%)`,
            maskImage: 'linear-gradient(180deg, transparent, black 24%, black 72%, transparent)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent, black 24%, black 72%, transparent)',
          }}
        />
      </div>
    </>
  );
}

// ─── Weather background compositor ───────────────────────────────────────────

export function WeatherBackground({
  condition,
  effectsQuality,
  hasCustomTint,
  size,
  theme,
}: {
  condition: WeatherCondition | string;
  effectsQuality: EffectsQuality;
  hasCustomTint: boolean;
  size: CardSize;
  theme: ThemeType;
}) {
  const variant = getWeatherBackgroundVariant(condition);
  const isLarge = size === 'large';
  const isMedium = size === 'medium';

  if (hasCustomTint) {
    return null;
  }

  const surface = getWeatherThemeSurface(theme, variant);

  if (size === 'tiny' || size === 'extra-small') {
    return <div className={`absolute inset-0 ${surface.baseGradient}`} />;
  }

  if (variant === 'sunny') {
    const sunClassName = pickThemeValue(theme, {
      light: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-30 blur-2xl'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-25 blur-2xl'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-25 blur-2xl',
      glass: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-22 blur-2xl'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-18 blur-2xl'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-18 blur-2xl',
      dark: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-20 blur-2xl'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-17 blur-2xl'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-17 blur-2xl',
      black: isLarge
        ? 'right-[-8%] top-[-10%] h-56 w-56 opacity-16 blur-2xl'
        : isMedium
          ? 'right-[-16%] top-[-34%] h-40 w-40 opacity-14 blur-2xl'
          : 'right-[-18%] top-[-28%] h-40 w-40 opacity-14 blur-2xl',
    });
    const sunnySurface = getSunnyThemeSurface(theme);
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <div className={`absolute rounded-full bg-[#9fd7ff] ${sunClassName}`} />
        <div
          className={`absolute rounded-full border border-[#bfe6ff]/18 ${
            isLarge
              ? 'right-[-2%] top-[-4%] h-44 w-44'
              : isMedium
                ? 'right-[-8%] top-[-24%] h-32 w-32'
                : 'right-[-10%] top-[-18%] h-32 w-32'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#9fc6ff]/10 ${
            isLarge
              ? 'right-[-12%] top-[-14%] h-64 w-64'
              : isMedium
                ? 'right-[-20%] top-[-40%] h-48 w-48'
                : 'right-[-22%] top-[-34%] h-48 w-48'
          }`}
        />
        {sunnySurface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${sunnySurface.themeSurfaceClassName}`} />
        ) : null}
        {sunnySurface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'clear-night') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <div
          className={`absolute rounded-full bg-[#dbeafe]/24 blur-xl ${
            isLarge ? 'right-[10%] top-[6%] h-20 w-20' : 'right-[10%] top-[0%] h-14 w-14'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#c7dcff]/10 ${
            isLarge ? 'right-[4%] top-[-2%] h-32 w-32' : 'right-[2%] top-[-12%] h-24 w-24'
          }`}
        />
        <div
          className={`absolute rounded-full border border-[#8299df]/10 ${
            isLarge ? 'right-[-2%] top-[-8%] h-44 w-44' : 'right-[-8%] top-[-20%] h-32 w-32'
          }`}
        />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'cloudy') {
    const waveOpacity = pickThemeValue(theme, {
      light: 'opacity-95',
      glass: 'opacity-62',
      dark: 'opacity-72',
      black: 'opacity-58',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(207,231,255,0.28)"
          layerTwoColor="rgba(174,212,246,0.20)"
          layerThreeColor="rgba(140,190,235,0.18)"
          rimColor="rgba(224,241,255,0.12)"
          className={waveOpacity}
        />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'rain') {
    const waveOpacity = pickThemeValue(theme, {
      light: 'opacity-90',
      glass: 'opacity-58',
      dark: 'opacity-70',
      black: 'opacity-56',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(142,162,210,0.16)"
          layerTwoColor="rgba(102,122,176,0.16)"
          layerThreeColor="rgba(67,86,136,0.22)"
          rimColor="rgba(196,214,255,0.08)"
          className={waveOpacity}
        />
        <RainOverlaySvg size={size} intensity="rain" effectsQuality={effectsQuality} />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'storm') {
    const nearWaveOpacity = pickThemeValue(theme, {
      light: 'opacity-88',
      glass: 'opacity-56',
      dark: 'opacity-68',
      black: 'opacity-52',
    });
    const farWaveOpacity = pickThemeValue(theme, {
      light: 'opacity-92',
      glass: 'opacity-60',
      dark: 'opacity-72',
      black: 'opacity-56',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <StormLightningOverlaySvg size={size} effectsQuality={effectsQuality} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(130,145,196,0.16)"
          layerTwoColor="rgba(88,104,160,0.18)"
          layerThreeColor="rgba(50,66,118,0.24)"
          rimColor="rgba(188,204,255,0.06)"
          className={nearWaveOpacity}
        />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(89,104,154,0.16)"
          layerTwoColor="rgba(58,71,120,0.22)"
          layerThreeColor="rgba(30,40,82,0.28)"
          rimColor="rgba(128,146,208,0.05)"
          className={farWaveOpacity}
        />
        <RainOverlaySvg size={size} intensity="storm" effectsQuality={effectsQuality} />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'windy') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <WindOverlaySvg size={size} />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'fog') {
    const fogOpacity = pickThemeValue(theme, {
      light: 'opacity-80',
      glass: 'opacity-54',
      dark: 'opacity-66',
      black: 'opacity-50',
    });
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(235,243,252,0.18)"
          layerTwoColor="rgba(215,230,245,0.14)"
          layerThreeColor="rgba(182,205,228,0.12)"
          rimColor="rgba(255,255,255,0.08)"
          className={fogOpacity}
        />
        <FogOverlaySvg size={size} />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'snow-night') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(116,138,192,0.14)"
          layerTwoColor="rgba(79,104,160,0.14)"
          layerThreeColor="rgba(42,63,110,0.20)"
          rimColor="rgba(208,224,255,0.06)"
          className="opacity-85"
        />
        <div
          className={`absolute rounded-full bg-[#f7e8ae]/86 ${
            isLarge ? 'right-[10%] top-[4%] h-16 w-16' : 'right-[10%] top-[-2%] h-12 w-12'
          }`}
        />
        <SnowflakeOverlaySvg size={size} tone="night" />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  if (variant === 'snow-day') {
    return (
      <>
        <div className={`absolute inset-0 ${surface.baseGradient}`} />
        <PassageWaveOverlaySvg
          size={size}
          layerOneColor="rgba(220,230,245,0.16)"
          layerTwoColor="rgba(184,201,222,0.14)"
          layerThreeColor="rgba(129,149,179,0.18)"
          rimColor="rgba(238,244,255,0.08)"
          className="opacity-90"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_34%,rgba(255,255,255,0.03)_66%,transparent)]" />
        <SnowflakeOverlaySvg size={size} tone="day" />
        {surface.themeSurfaceClassName ? (
          <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
        ) : null}
        {surface.darkThemeScrim}
      </>
    );
  }

  // Fallback: default cloudy appearance
  const fallbackWaveOpacity = pickThemeValue(theme, {
    light: 'opacity-95',
    glass: 'opacity-62',
    dark: 'opacity-72',
    black: 'opacity-58',
  });
  return (
    <>
      <div className={`absolute inset-0 ${surface.baseGradient}`} />
      <PassageWaveOverlaySvg
        size={size}
        layerOneColor="rgba(207,231,255,0.28)"
        layerTwoColor="rgba(174,212,246,0.20)"
        layerThreeColor="rgba(140,190,235,0.18)"
        rimColor="rgba(224,241,255,0.12)"
        className={fallbackWaveOpacity}
      />
      {surface.themeSurfaceClassName ? (
        <div className={`absolute inset-0 ${surface.themeSurfaceClassName}`} />
      ) : null}
      {surface.darkThemeScrim}
    </>
  );
}
