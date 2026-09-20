import type { WeatherForecastPoint, WeatherForecastType, WeatherModel } from './weather-model';
import { normalizeTemperatureUnit, type TemperatureUnit } from '@navet/app/utils/temperature';

type RawRecord = Record<string, unknown>;

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function firstNumber(record: RawRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = number(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizePoint(
  value: unknown,
  fallbackCondition?: string,
  fallbackTemperatureUnit?: TemperatureUnit
): WeatherForecastPoint | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as RawRecord;
  const datetime = string(record.datetime);
  if (!datetime) return null;
  return {
    datetime,
    condition: string(record.condition) ?? fallbackCondition,
    isDaytime: typeof record.is_daytime === 'boolean' ? record.is_daytime : undefined,
    temperature: firstNumber(record, 'temperature', 'native_temperature'),
    temperatureUnit:
      normalizeTemperatureUnit(
        record.temperature_unit ?? record.native_temperature_unit ?? record.unit_of_measurement
      ) ?? fallbackTemperatureUnit,
    temperatureLow: firstNumber(record, 'templow', 'native_templow'),
    apparentTemperature: firstNumber(record, 'apparent_temperature', 'native_apparent_temperature'),
    precipitationAmount: number(record.precipitation),
    precipitationProbability: number(record.precipitation_probability),
    precipitationUnit: string(record.precipitation_unit),
    humidity: number(record.humidity),
    pressure: number(record.pressure),
    windSpeed: firstNumber(record, 'wind_speed', 'native_wind_speed'),
    windGust: firstNumber(record, 'wind_gust_speed', 'native_wind_gust_speed'),
    windBearing: typeof record.wind_bearing === 'number' || typeof record.wind_bearing === 'string'
      ? record.wind_bearing
      : undefined,
    uvIndex: number(record.uv_index),
    cloudCoverage: number(record.cloud_coverage),
    dewPoint: number(record.dew_point),
  };
}

export function normalizeWeatherModel({
  entityId,
  entity,
  name,
  location,
  forecasts,
  sunEntity,
  updatedAt,
}: {
  entityId: string;
  entity: { state: string; attributes?: RawRecord; lastUpdated?: string };
  name?: string;
  location?: string;
  forecasts?: Partial<Record<WeatherForecastType, unknown[]>>;
  sunEntity?: { state?: string; attributes?: RawRecord };
  updatedAt?: string;
}): WeatherModel {
  const attributes = entity.attributes ?? {};
  const temperatureUnit = normalizeTemperatureUnit(
    attributes.temperature_unit ?? attributes.unit_of_measurement
  );
  const supportedFeatures = attributes.supported_features;
  const capabilities = {
    hourly: (forecasts?.hourly?.length ?? 0) > 0 || ((supportedFeatures as number) & 2) !== 0,
    daily: (forecasts?.daily?.length ?? 0) > 0 || ((supportedFeatures as number) & 1) !== 0,
    twiceDaily:
      (forecasts?.twice_daily?.length ?? 0) > 0 || ((supportedFeatures as number) & 4) !== 0,
  };
  const legacyForecast = Array.isArray(attributes.forecast) ? attributes.forecast : [];
  const normalizedForecast = {
    hourly: (forecasts?.hourly ?? [])
      .map((item) => normalizePoint(item, entity.state, temperatureUnit))
      .filter(Boolean) as WeatherForecastPoint[],
    daily: (forecasts?.daily ?? [])
      .map((item) => normalizePoint(item, entity.state, temperatureUnit))
      .filter(Boolean) as WeatherForecastPoint[],
    twiceDaily: (forecasts?.twice_daily ?? [])
      .map((item) => normalizePoint(item, entity.state, temperatureUnit))
      .filter(Boolean) as WeatherForecastPoint[],
  };
  if (normalizedForecast.daily.length === 0 && normalizedForecast.twiceDaily.length === 0 && legacyForecast.length > 0) {
    normalizedForecast.daily = legacyForecast
      .map((item) => normalizePoint(item, entity.state, temperatureUnit))
      .filter(Boolean) as WeatherForecastPoint[];
  }

  const sunrise = string(sunEntity?.attributes?.next_rising) ?? string(attributes.sunrise);
  const sunset = string(sunEntity?.attributes?.next_setting) ?? string(attributes.sunset);
  const isDay = sunEntity?.state === 'above_horizon'
    ? true
    : sunEntity?.state === 'below_horizon'
      ? false
      : undefined;

  return {
    entityId,
    name,
    location,
    current: {
      condition: entity.state,
      isDay,
      temperature: firstNumber(attributes, 'temperature', 'native_temperature'),
      temperatureUnit,
      apparentTemperature: firstNumber(attributes, 'apparent_temperature', 'native_apparent_temperature'),
      humidity: number(attributes.humidity),
      pressure: firstNumber(attributes, 'pressure', 'native_pressure'),
      pressureUnit: string(attributes.pressure_unit) ?? string(attributes.native_pressure_unit),
      windSpeed: firstNumber(attributes, 'wind_speed', 'native_wind_speed'),
      windGust: firstNumber(attributes, 'wind_gust_speed', 'native_wind_gust_speed', 'wind_gust'),
      windBearing: typeof attributes.wind_bearing === 'number' || typeof attributes.wind_bearing === 'string'
        ? attributes.wind_bearing
        : undefined,
      windSpeedUnit: string(attributes.wind_speed_unit) ?? string(attributes.native_wind_speed_unit),
      visibility: number(attributes.visibility),
      visibilityUnit: string(attributes.visibility_unit),
      dewPoint: number(attributes.dew_point),
      uvIndex: firstNumber(attributes, 'uv_index', 'uv'),
      cloudCoverage: firstNumber(attributes, 'cloud_coverage', 'cloudiness', 'clouds'),
      precipitationAmount: number(attributes.precipitation),
      precipitationProbability: number(attributes.precipitation_probability),
      precipitationUnit: string(attributes.precipitation_unit),
      sunrise,
      sunset,
    },
    forecast: normalizedForecast,
    capabilities,
    updatedAt: updatedAt ?? entity.lastUpdated,
  };
}
