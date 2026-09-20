import type { TemperatureUnit } from '@navet/app/utils/temperature';

export type WeatherForecastType = 'hourly' | 'daily' | 'twice_daily';

export interface WeatherForecastCollections {
  hourly: WeatherForecastPoint[];
  daily: WeatherForecastPoint[];
  twiceDaily: WeatherForecastPoint[];
}

export interface WeatherForecastCapabilities {
  hourly: boolean;
  daily: boolean;
  twiceDaily: boolean;
}

export interface WeatherForecastPoint {
  datetime: string;
  condition?: string;
  isDaytime?: boolean;
  temperature?: number;
  temperatureUnit?: TemperatureUnit;
  temperatureLow?: number;
  apparentTemperature?: number;
  precipitationAmount?: number;
  precipitationProbability?: number;
  precipitationUnit?: string;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windGust?: number;
  windBearing?: number | string;
  uvIndex?: number;
  cloudCoverage?: number;
  dewPoint?: number;
}

export interface WeatherModel {
  entityId: string;
  name?: string;
  location?: string;
  current: {
    condition?: string;
    isDay?: boolean;
    temperature?: number;
    temperatureUnit?: TemperatureUnit;
    apparentTemperature?: number;
    humidity?: number;
    pressure?: number;
    pressureUnit?: string;
    windSpeed?: number;
    windGust?: number;
    windBearing?: number | string;
    windSpeedUnit?: string;
    visibility?: number;
    visibilityUnit?: string;
    dewPoint?: number;
    uvIndex?: number;
    cloudCoverage?: number;
    precipitationAmount?: number;
    precipitationProbability?: number;
    precipitationUnit?: string;
    sunrise?: string;
    sunset?: string;
  };
  forecast: WeatherForecastCollections;
  capabilities: WeatherForecastCapabilities;
  updatedAt?: string;
}

export const EMPTY_WEATHER_FORECAST: WeatherForecastCollections = {
  hourly: [],
  daily: [],
  twiceDaily: [],
};

export const EMPTY_WEATHER_CAPABILITIES: WeatherForecastCapabilities = {
  hourly: false,
  daily: false,
  twiceDaily: false,
};

export function supportsForecastType(
  supportedFeatures: unknown,
  forecastType: WeatherForecastType
): boolean {
  if (typeof supportedFeatures !== 'number') return false;
  const flags: Record<WeatherForecastType, number> = {
    daily: 1,
    hourly: 2,
    twice_daily: 4,
  };
  return (supportedFeatures & flags[forecastType]) !== 0;
}

export function getDailyForecastType(
  capabilities: WeatherForecastCapabilities
): 'daily' | 'twice_daily' | undefined {
  if (capabilities.daily) return 'daily';
  if (capabilities.twiceDaily) return 'twice_daily';
  return undefined;
}
