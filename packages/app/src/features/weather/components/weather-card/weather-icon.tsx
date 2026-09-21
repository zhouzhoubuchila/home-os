import type { CSSProperties, ReactElement, ReactNode, SVGProps } from 'react';
import { formatHomeOsWeatherCondition } from '@navet/app/features/home-os/i18n/display-state';
import type { ThemeType } from '@navet/app/hooks';
import animatedClearDay from '../../third_party/weather-icons/line/svg/clear-day.svg';
import animatedClearNight from '../../third_party/weather-icons/line/svg/clear-night.svg';
import animatedCloudy from '../../third_party/weather-icons/line/svg/cloudy.svg';
import animatedFogDay from '../../third_party/weather-icons/line/svg/fog-day.svg';
import animatedFogNight from '../../third_party/weather-icons/line/svg/fog-night.svg';
import animatedHail from '../../third_party/weather-icons/line/svg/hail.svg';
import animatedPartlyCloudyDay from '../../third_party/weather-icons/line/svg/partly-cloudy-day.svg';
import animatedPartlyCloudyDayRain from '../../third_party/weather-icons/line/svg/partly-cloudy-day-rain.svg';
import animatedPartlyCloudyNight from '../../third_party/weather-icons/line/svg/partly-cloudy-night.svg';
import animatedPartlyCloudyNightRain from '../../third_party/weather-icons/line/svg/partly-cloudy-night-rain.svg';
import animatedRain from '../../third_party/weather-icons/line/svg/rain.svg';
import animatedSleet from '../../third_party/weather-icons/line/svg/sleet.svg';
import animatedSnow from '../../third_party/weather-icons/line/svg/snow.svg';
import animatedThunderstormsDay from '../../third_party/weather-icons/line/svg/thunderstorms-day.svg';
import animatedThunderstormsDayRain from '../../third_party/weather-icons/line/svg/thunderstorms-day-rain.svg';
import animatedThunderstormsNight from '../../third_party/weather-icons/line/svg/thunderstorms-night.svg';
import animatedThunderstormsNightRain from '../../third_party/weather-icons/line/svg/thunderstorms-night-rain.svg';
import animatedWindsock from '../../third_party/weather-icons/line/svg/windsock.svg';
import staticClearDay from '../../third_party/weather-icons/line/svg-static/clear-day.svg';
import staticClearNight from '../../third_party/weather-icons/line/svg-static/clear-night.svg';
import staticCloudy from '../../third_party/weather-icons/line/svg-static/cloudy.svg';
import staticFogDay from '../../third_party/weather-icons/line/svg-static/fog-day.svg';
import staticFogNight from '../../third_party/weather-icons/line/svg-static/fog-night.svg';
import staticHail from '../../third_party/weather-icons/line/svg-static/hail.svg';
import staticPartlyCloudyDay from '../../third_party/weather-icons/line/svg-static/partly-cloudy-day.svg';
import staticPartlyCloudyDayRain from '../../third_party/weather-icons/line/svg-static/partly-cloudy-day-rain.svg';
import staticPartlyCloudyNight from '../../third_party/weather-icons/line/svg-static/partly-cloudy-night.svg';
import staticPartlyCloudyNightRain from '../../third_party/weather-icons/line/svg-static/partly-cloudy-night-rain.svg';
import staticRain from '../../third_party/weather-icons/line/svg-static/rain.svg';
import staticSleet from '../../third_party/weather-icons/line/svg-static/sleet.svg';
import staticSnow from '../../third_party/weather-icons/line/svg-static/snow.svg';
import staticThunderstormsDay from '../../third_party/weather-icons/line/svg-static/thunderstorms-day.svg';
import staticThunderstormsDayRain from '../../third_party/weather-icons/line/svg-static/thunderstorms-day-rain.svg';
import staticThunderstormsNight from '../../third_party/weather-icons/line/svg-static/thunderstorms-night.svg';
import staticThunderstormsNightRain from '../../third_party/weather-icons/line/svg-static/thunderstorms-night-rain.svg';
import staticWindsock from '../../third_party/weather-icons/line/svg-static/windsock.svg';

export type WeatherCondition =
  | 'Clear'
  | 'Cloudy'
  | 'Rainy'
  | 'Snowy'
  | 'Drizzle'
  | 'Fog'
  | 'Thunderstorm'
  | 'Partly Cloudy'
  | 'Sunny';

interface WeatherIconProps {
  condition: WeatherCondition | string;
  className?: string;
  style?: CSSProperties;
  isNight?: boolean;
  animated?: boolean;
  theme?: ThemeType;
}

type WeatherIconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

function normalizeWeatherCondition(condition: WeatherCondition | string) {
  return condition.trim().toLowerCase().replace(/_/g, '-');
}

function getWeatherIconAsset(
  condition: WeatherCondition | string,
  isNight: boolean,
  animated: boolean
) {
  const name = normalizeWeatherCondition(condition);
  const assets = animated
    ? {
        clearDay: animatedClearDay,
        clearNight: animatedClearNight,
        cloudy: animatedCloudy,
        fogDay: animatedFogDay,
        fogNight: animatedFogNight,
        hail: animatedHail,
        partlyDay: animatedPartlyCloudyDay,
        partlyNight: animatedPartlyCloudyNight,
        partlyRainDay: animatedPartlyCloudyDayRain,
        partlyRainNight: animatedPartlyCloudyNightRain,
        rain: animatedRain,
        sleet: animatedSleet,
        snow: animatedSnow,
        stormDay: animatedThunderstormsDay,
        stormNight: animatedThunderstormsNight,
        stormRainDay: animatedThunderstormsDayRain,
        stormRainNight: animatedThunderstormsNightRain,
        wind: animatedWindsock,
      }
    : {
        clearDay: staticClearDay,
        clearNight: staticClearNight,
        cloudy: staticCloudy,
        fogDay: staticFogDay,
        fogNight: staticFogNight,
        hail: staticHail,
        partlyDay: staticPartlyCloudyDay,
        partlyNight: staticPartlyCloudyNight,
        partlyRainDay: staticPartlyCloudyDayRain,
        partlyRainNight: staticPartlyCloudyNightRain,
        rain: staticRain,
        sleet: staticSleet,
        snow: staticSnow,
        stormDay: staticThunderstormsDay,
        stormNight: staticThunderstormsNight,
        stormRainDay: staticThunderstormsDayRain,
        stormRainNight: staticThunderstormsNightRain,
        wind: staticWindsock,
      };

  if (name === 'clear-night' || name === 'night-clear' || name === 'night' || name === 'moony') {
    return assets.clearNight;
  }
  if (name === 'clear' || name === 'sunny' || name === 'fair') {
    return isNight ? assets.clearNight : assets.clearDay;
  }
  if (name === 'cloudy' || name === 'overcast') return assets.cloudy;
  if (name === 'fog' || name === 'mist' || name === 'hazy') return isNight ? assets.fogNight : assets.fogDay;
  if (name === 'partlycloudy-night' || name === 'partly-cloudy-night') return assets.partlyNight;
  if (name === 'partlycloudy' || name === 'partly-cloudy' || name === 'partly cloudy') {
    return isNight ? assets.partlyNight : assets.partlyDay;
  }
  if (name === 'rainy' || name === 'rain' || name === 'pouring' || name === 'showers') return assets.rain;
  if (name === 'drizzle') return assets.partlyRainNight && isNight ? assets.partlyRainNight : assets.partlyRainDay;
  if (name === 'snowy' || name === 'snow' || name === 'snow-night' || name === 'blizzard') return assets.snow;
  if (name === 'snowy-rainy') return assets.sleet;
  if (name === 'hail') return assets.hail;
  if (name === 'lightning-rainy') return isNight ? assets.stormRainNight : assets.stormRainDay;
  if (name === 'thunderstorm' || name === 'storm' || name === 'lightning' || name === 'exceptional') {
    return isNight ? assets.stormNight : assets.stormDay;
  }
  if (name === 'windy' || name === 'windy-variant' || name === 'breezy') return assets.wind;
  return undefined;
}

export function formatWeatherConditionLabel(condition: WeatherCondition | string, language = 'en') {
  const normalized = normalizeWeatherCondition(condition);

  switch (normalized) {
    case 'clear-night':
    case 'night-clear':
    case 'night':
    case 'moony':
      return formatHomeOsWeatherCondition('clear-night', language);
    case 'partlycloudy':
    case 'partly-cloudy':
    case 'partly cloudy':
      return formatHomeOsWeatherCondition('partly-cloudy', language);
    case 'partlycloudy-night':
    case 'partly-cloudy-night':
      return formatHomeOsWeatherCondition('partly-cloudy', language);
    case 'lightning-rainy':
      return formatHomeOsWeatherCondition('lightning-rainy', language);
    case 'snowy-rainy':
      return formatHomeOsWeatherCondition('snowy', language);
    case 'snow-night':
      return formatHomeOsWeatherCondition('snowy', language);
    case 'windy-variant':
      return formatHomeOsWeatherCondition('windy', language);
    default:
      return formatHomeOsWeatherCondition(normalized, language) || normalized.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }
}

function IllustratedSvg({
  className,
  style,
  children,
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <path
        d="M24 3.5v5.2M24 39.3v5.2M8.7 24H3.5M44.5 24h-5.2M13.2 13.2 9.5 9.5M38.5 38.5l-3.7-3.7M34.8 13.2l3.7-3.7M9.5 38.5l3.7-3.7"
        stroke="#FDE68A"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <circle cx="24" cy="24" r="12.4" fill="#FACC15" />
      <circle cx="20" cy="19" r="4.5" fill="#FEF3C7" opacity="0.8" />
      <path
        d="M16.3 28.5c3.6 5.4 12.2 5.2 15.5-.4"
        stroke="#F59E0B"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </IllustratedSvg>
  );
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <circle cx="18" cy="14" r="2" fill="#FDE68A" />
      <circle cx="35" cy="10" r="1.7" fill="#DBEAFE" />
      <circle cx="38" cy="27" r="1.5" fill="#BFDBFE" />
      <path
        d="M31.8 38.6c-10.7 1.7-20-6.3-20-16.4 0-7 4.4-13.2 10.9-15.6 1.2-.4 2.1.9 1.4 1.9a13 13 0 0 0 15.4 19.4c1.1-.5 2.2.6 1.6 1.7a16.5 16.5 0 0 1-9.3 9Z"
        fill="#C4B5FD"
      />
      <path
        d="M29.5 35.1c-7.9.5-14.3-5.4-14.3-12.9 0-5.2 3.1-9.7 7.7-11.8a13 13 0 0 0 13.6 20.8 12.5 12.5 0 0 1-7 3.9Z"
        fill="#F5F3FF"
        opacity="0.88"
      />
    </IllustratedSvg>
  );
}

function CloudShape({ storm = false }: { storm?: boolean }) {
  return (
    <>
      <path
        d="M15.6 35.4h19.5c5 0 8.7-3.4 8.7-8.1 0-4.2-3.3-7.6-7.7-7.9C34.8 14 30 10.2 24.2 10.2c-6.1 0-11.2 4.3-12.2 10.1-4.5.8-7.8 3.8-7.8 7.7 0 4.5 4.2 7.4 11.4 7.4Z"
        fill={storm ? '#64748B' : '#E0F2FE'}
      />
      <path
        d="M14.8 32.2h20.5c3.1 0 5.2-1.8 5.2-4.4 0-2.3-2-4.1-4.6-4.1h-2.2l-.4-2.1c-.7-4-4.2-6.8-8.6-6.8-4.6 0-8.2 3.1-8.8 7.4l-.3 2.1-2.1.2c-3.8.4-6.3 2-6.3 4.3 0 2 2.8 3.4 7.6 3.4Z"
        fill={storm ? '#94A3B8' : '#F8FAFC'}
        opacity="0.9"
      />
    </>
  );
}

function CloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <CloudShape />
    </IllustratedSvg>
  );
}

function PartlyCloudyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <circle cx="18" cy="17" r="9.2" fill="#FACC15" />
      <path
        d="M18 3.5v4M18 26v4M4.5 17h4M27.5 17h4M8.5 7.5l2.8 2.8M24.7 23.7l2.8 2.8M27.5 7.5l-2.8 2.8M11.3 23.7l-2.8 2.8"
        stroke="#FDE68A"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <CloudShape />
    </IllustratedSvg>
  );
}

function PartlyCloudyNightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <path
        d="M21.8 7.2A10.5 10.5 0 0 0 34 22.9a12.2 12.2 0 0 1-9.8 4.6c-6.5 0-11.8-5-11.8-11.2 0-4 2.1-7.4 5.4-9.4 1.6-1 3.1-.9 4 .3Z"
        fill="#DDD6FE"
      />
      <circle cx="35" cy="10" r="1.9" fill="#BFDBFE" />
      <CloudShape />
    </IllustratedSvg>
  );
}

function RainIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <CloudShape />
      <path
        d="M15 39.8 18.5 34M25 41.2 28.5 35.4M35 39.8 38.5 34"
        stroke="#38BDF8"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
    </IllustratedSvg>
  );
}

function DrizzleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <CloudShape />
      <path
        d="M16.5 39.2v-4.5M25 41v-4.5M33.5 39.2v-4.5"
        stroke="#7DD3FC"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </IllustratedSvg>
  );
}

function SnowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <CloudShape />
      <path
        d="M16 35.5v6M13.4 37l5.2 3M18.6 37l-5.2 3M31.5 35.5v6M28.9 37l5.2 3M34.1 37l-5.2 3"
        stroke="#BAE6FD"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="24" cy="38.8" r="2.3" fill="#E0F2FE" />
    </IllustratedSvg>
  );
}

function FogIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <CloudShape />
      <path
        d="M9 37h30M13 42h22M7 32.3h10M25 32.3h16"
        stroke="#CBD5E1"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </IllustratedSvg>
  );
}

function StormIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <CloudShape storm />
      <path d="m24.6 28.5-5.1 9h5.7l-2.2 7 7.1-10.6h-5.7l2.4-5.4h-2.2Z" fill="#FACC15" />
      <path
        d="M14 41.5 17 36M36 41.5l3-5.5"
        stroke="#38BDF8"
        strokeLinecap="round"
        strokeWidth="2.8"
      />
    </IllustratedSvg>
  );
}

function WindIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IllustratedSvg {...props}>
      <path
        d="M6 18h23.5c4 0 6.5-2 6.5-5.1 0-2.8-2.1-4.9-4.9-4.9-2.4 0-4.1 1.3-4.9 3.5"
        stroke="#93C5FD"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M8 27h27c4.5 0 7 2.2 7 5.6 0 3.2-2.4 5.4-5.5 5.4-2.7 0-4.6-1.4-5.5-3.9"
        stroke="#38BDF8"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path d="M13 36h12" stroke="#CFFAFE" strokeLinecap="round" strokeWidth="4" />
    </IllustratedSvg>
  );
}

export function getWeatherIconComponent(
  condition: WeatherCondition | string
): WeatherIconComponent {
  switch (normalizeWeatherCondition(condition)) {
    case 'clear':
    case 'sunny':
    case 'fair':
      return SunIcon;
    case 'clear-night':
    case 'night-clear':
    case 'night':
    case 'moony':
      return MoonIcon;
    case 'cloudy':
    case 'overcast':
      return CloudIcon;
    case 'fog':
    case 'mist':
    case 'hazy':
      return FogIcon;
    case 'partly cloudy':
    case 'partlycloudy':
    case 'partly-cloudy':
    case 'partlycloudy-day':
      return PartlyCloudyIcon;
    case 'partlycloudy-night':
    case 'partly-cloudy-night':
      return PartlyCloudyNightIcon;
    case 'rainy':
    case 'rain':
    case 'pouring':
    case 'showers':
      return RainIcon;
    case 'snowy':
    case 'snow':
    case 'snowy-rainy':
    case 'snow-night':
    case 'blizzard':
      return SnowIcon;
    case 'drizzle':
      return DrizzleIcon;
    case 'thunderstorm':
    case 'storm':
    case 'lightning':
    case 'lightning-rainy':
    case 'hail':
    case 'exceptional':
      return StormIcon;
    case 'windy':
    case 'windy-variant':
    case 'breezy':
      return WindIcon;
    default:
      return CloudIcon;
  }
}

/**
 * Weather Icon Component
 * Returns appropriate icon based on weather condition
 */
export const WeatherIcon = ({
  condition,
  className = 'w-6 h-6',
  style,
  isNight = false,
  animated = false,
  theme = 'dark',
}: WeatherIconProps) => {
  const normalized = normalizeWeatherCondition(condition);
  const effectiveCondition =
    isNight && (normalized === 'sunny' || normalized === 'clear' || normalized === 'fair')
      ? 'clear-night'
      : isNight && normalized === 'partlycloudy'
        ? 'partlycloudy-night'
        : normalized;
  const asset = getWeatherIconAsset(effectiveCondition, isNight, animated);
  if (asset) {
    return (
      <img
        src={asset}
        alt=""
        aria-hidden="true"
        className={`${className} ${theme === 'light' ? 'opacity-85' : 'brightness-0 invert'}`}
        style={style}
      />
    );
  }
  const IconComponent = getWeatherIconComponent(effectiveCondition);
  return <IconComponent className={`${className} ${animated ? 'motion-safe:animate-pulse' : ''}`} style={style} />;
};
