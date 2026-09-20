import type { TranslateFn } from '@navet/app/i18n/index';
import { normalizeWeatherModel } from '@navet/app/features/weather/model/weather-normalizer';
import type { WeatherDevice } from '@navet/app/types/device.types';
import { LruCache } from '@navet/app/utils/lru-cache';
import { normalizeTemperatureUnit, type TemperatureUnit } from '@navet/app/utils/temperature';
import {
  formatClock,
  formatDaylight,
  formatMetricNumber,
  parseNumberish,
  parseRoundedNumberish,
} from '../entity-utils';

type WeatherForecastEntry = Record<string, unknown>;
type WeatherEntityLike = {
  state: string;
  attributes?: Record<string, unknown>;
  lastUpdated?: string;
};

const WEATHER_DATE_FORMATTER_CACHE_MAX_ENTRIES = 16;
const weatherDateFormatterCache = new LruCache<
  string,
  { hourly: Intl.DateTimeFormat; weekly: Intl.DateTimeFormat }
>(WEATHER_DATE_FORMATTER_CACHE_MAX_ENTRIES);

function getWeatherDateFormatters(locale: string, use24HourTime: boolean) {
  const cacheKey = `${locale}:${use24HourTime ? '24' : '12'}`;
  const cached = weatherDateFormatterCache.get(cacheKey);
  if (cached) return cached;

  const formatters = {
    hourly: new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      hour12: !use24HourTime,
    }),
    weekly: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
  };
  weatherDateFormatterCache.set(cacheKey, formatters);
  return formatters;
}

function resolveTemperatureUnit(...values: unknown[]): TemperatureUnit | undefined {
  for (const value of values) {
    const unit = normalizeTemperatureUnit(value);
    if (unit) {
      return unit;
    }
  }

  return undefined;
}

interface WeatherContext {
  locale: string;
  t: TranslateFn;
  use24HourTime: boolean;
  sunEntity?: WeatherEntityLike;
  config?: Record<string, unknown> | null;
  weatherForecastMode: 'weekly' | 'hourly';
  storedForecasts?: {
    daily: WeatherForecastEntry[];
    hourly: WeatherForecastEntry[];
    twice_daily?: WeatherForecastEntry[];
  };
}

export function mapWeatherDevice(
  entityId: string,
  entity: WeatherEntityLike,
  name: string,
  room: string,
  context: WeatherContext
): WeatherDevice {
  const { sunEntity, config, weatherForecastMode, storedForecasts, locale, t, use24HourTime } =
    context;

  const sunEntitySunrise = sunEntity?.attributes?.next_rising;
  const sunEntitySunset = sunEntity?.attributes?.next_setting;

  const fallbackDailyForecast = Array.isArray(entity.attributes?.forecast)
    ? (entity.attributes.forecast as WeatherForecastEntry[])
    : [];
  const dailyForecastSource =
    storedForecasts?.daily && storedForecasts.daily.length > 0
      ? storedForecasts.daily
      : fallbackDailyForecast;
  const hourlyForecastSource =
    storedForecasts?.hourly && storedForecasts.hourly.length > 0 ? storedForecasts.hourly : [];
  const twiceDailyForecastSource =
    storedForecasts?.twice_daily && storedForecasts.twice_daily.length > 0
      ? storedForecasts.twice_daily
      : [];
  const effectiveDailyForecastSource =
    dailyForecastSource.length > 0 ? dailyForecastSource : twiceDailyForecastSource;
  const selectedForecastSource =
    weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0
      ? hourlyForecastSource
      : dailyForecastSource;
  const effectiveForecastMode =
    weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0 ? 'hourly' : 'weekly';
  const entityTemperatureUnit = resolveTemperatureUnit(
    entity.attributes?.unit_of_measurement,
    entity.attributes?.temperature_unit,
    entity.attributes?.native_unit_of_measurement
  );

  const { hourly: hourlyFormatter, weekly: weeklyFormatter } = getWeatherDateFormatters(
    locale,
    use24HourTime
  );

  const forecast = selectedForecastSource
    .slice(0, 7)
    .map((entry: Record<string, unknown>, index) => {
      const forecastDate =
        typeof entry.datetime === 'string'
          ? new Date(entry.datetime)
          : typeof entry.datetime === 'number'
            ? new Date(entry.datetime)
            : null;
      const dayLabel =
        forecastDate && !Number.isNaN(forecastDate.getTime())
          ? effectiveForecastMode === 'hourly'
            ? hourlyFormatter.format(forecastDate)
            : index === 0
              ? t('weather.today')
              : weeklyFormatter.format(forecastDate)
          : effectiveForecastMode === 'hourly'
            ? `+${index + 1}h`
            : index === 0
              ? t('weather.today')
              : t('weather.dayFallback', { day: index + 1 });
      const forecastTemperature =
        parseRoundedNumberish(entry.temperature) ??
        parseRoundedNumberish(entry.native_temperature) ?? undefined;
      const forecastTemperatureUnit = resolveTemperatureUnit(
        entry.temperature_unit,
        entry.native_temperature_unit,
        entry.unit_of_measurement,
        entry.native_unit_of_measurement,
        entityTemperatureUnit
      );
      const forecastLowUnit = resolveTemperatureUnit(
        entry.templow_unit,
        entry.native_templow_unit,
        entry.temperature_unit,
        entry.native_temperature_unit,
        entry.unit_of_measurement,
        entry.native_unit_of_measurement,
        entityTemperatureUnit
      );

      return {
        day: dayLabel,
        condition: (typeof entry.condition === 'string' && entry.condition) || entity.state,
        high: forecastTemperature,
        highUnit: forecastTemperatureUnit,
        low:
          effectiveForecastMode === 'hourly'
            ? forecastTemperature
            : parseRoundedNumberish(entry.templow) ?? undefined,
        lowUnit: effectiveForecastMode === 'hourly' ? forecastTemperatureUnit : forecastLowUnit,
      };
    });

  const highTemp =
    parseRoundedNumberish(effectiveDailyForecastSource[0]?.temperature) ??
    parseRoundedNumberish(entity.attributes?.temperature) ??
    parseRoundedNumberish(entity.attributes?.native_temperature) ??
    undefined;
  const lowTemp = parseRoundedNumberish(effectiveDailyForecastSource[0]?.templow) ?? undefined;
  const weatherTemperature = parseRoundedNumberish(entity.attributes?.temperature);
  const nativeWeatherTemperature = parseRoundedNumberish(entity.attributes?.native_temperature);
  const displayWeatherTemperature = weatherTemperature ?? nativeWeatherTemperature ?? undefined;
  const weatherTemperatureUnit =
    weatherTemperature !== undefined
      ? entityTemperatureUnit
      : resolveTemperatureUnit(
          entity.attributes?.native_unit_of_measurement,
          entityTemperatureUnit
        );
  const apparentTemperature = parseRoundedNumberish(entity.attributes?.apparent_temperature);
  const nativeApparentTemperature = parseRoundedNumberish(
    entity.attributes?.native_apparent_temperature
  );
  const precipitationUnit =
    typeof entity.attributes?.precipitation_unit === 'string'
      ? entity.attributes.precipitation_unit
      : undefined;
  const precipitationValue = parseNumberish(entity.attributes?.precipitation) ?? undefined;
  const tomorrowForecast = effectiveDailyForecastSource[1] as Record<string, unknown> | undefined;
  const tomorrowPrecipitationProbability = tomorrowForecast
    ? parseNumberish(tomorrowForecast.precipitation_probability)
    : null;
  const tomorrowPrecipitationAmount = tomorrowForecast
    ? parseNumberish(tomorrowForecast.precipitation)
    : null;

  const sunriseSource = sunEntitySunrise ?? entity.attributes?.sunrise;
  const sunsetSource = sunEntitySunset ?? entity.attributes?.sunset;
  const configLocationName =
    config &&
    typeof config === 'object' &&
    'location_name' in config &&
    typeof config.location_name === 'string'
      ? config.location_name
      : '';
  const weatherLocation =
    (typeof entity.attributes?.location === 'string' && entity.attributes.location) ||
    (typeof entity.attributes?.city === 'string' && entity.attributes.city) ||
    (typeof entity.attributes?.place === 'string' && entity.attributes.place) ||
    name ||
    room ||
    configLocationName ||
    entityId;

  return {
    id: entityId,
    name,
    room,
    size: 'large',
    location: weatherLocation,
    temperature: displayWeatherTemperature ?? 0,
    temperatureUnit: weatherTemperatureUnit,
    feelsLikeTemperature: apparentTemperature ?? nativeApparentTemperature ?? undefined,
    feelsLikeTemperatureUnit:
      apparentTemperature !== undefined
        ? resolveTemperatureUnit(
            entity.attributes?.apparent_temperature_unit,
            entityTemperatureUnit
          )
        : resolveTemperatureUnit(
            entity.attributes?.native_apparent_temperature_unit,
            entity.attributes?.native_unit_of_measurement,
            entityTemperatureUnit
          ),
    condition: entity.state,
    humidity: parseNumberish(entity.attributes?.humidity) ?? undefined,
    windSpeed:
      parseNumberish(entity.attributes?.wind_speed) ??
      parseNumberish(entity.attributes?.native_wind_speed) ??
      undefined,
    windSpeedUnit:
      (typeof entity.attributes?.wind_speed_unit === 'string' &&
        entity.attributes.wind_speed_unit) ||
      (typeof entity.attributes?.native_wind_speed_unit === 'string' &&
        entity.attributes.native_wind_speed_unit) ||
      'km/h',
    windGustSpeed:
      parseNumberish(entity.attributes?.wind_gust_speed) ??
      parseNumberish(entity.attributes?.native_wind_gust_speed) ??
      parseNumberish(entity.attributes?.wind_gust) ??
      undefined,
    pressure:
      parseNumberish(entity.attributes?.pressure) ??
      parseNumberish(entity.attributes?.native_pressure) ??
      undefined,
    pressureUnit:
      (typeof entity.attributes?.pressure_unit === 'string' && entity.attributes.pressure_unit) ||
      (typeof entity.attributes?.native_pressure_unit === 'string' &&
        entity.attributes.native_pressure_unit) ||
      'hPa',
    uvIndex:
      parseNumberish(entity.attributes?.uv_index) ??
      parseNumberish(entity.attributes?.uv) ??
      undefined,
    cloudCoverage:
      parseNumberish(entity.attributes?.cloud_coverage) ??
      parseNumberish(entity.attributes?.cloudiness) ??
      parseNumberish(entity.attributes?.clouds) ??
      undefined,
    precipitation: precipitationValue ?? undefined,
    precipitationUnit,
    sunrise: formatClock(sunriseSource, locale, use24HourTime),
    sunset: formatClock(sunsetSource, locale, use24HourTime),
    daylight: formatDaylight(sunriseSource, sunsetSource),
    rainForecast:
      tomorrowPrecipitationProbability !== null
        ? t('weather.rainTomorrow', {
            chance: Math.round(tomorrowPrecipitationProbability),
          })
        : tomorrowPrecipitationAmount !== null
          ? t('weather.precipitationTomorrow', {
              amount: formatMetricNumber(tomorrowPrecipitationAmount),
              unit: precipitationUnit ?? '',
            })
          : '',
    highTemp,
    highTempUnit: resolveTemperatureUnit(
      effectiveDailyForecastSource[0]?.temperature_unit,
      effectiveDailyForecastSource[0]?.native_temperature_unit,
      entityTemperatureUnit
    ),
    lowTemp,
    lowTempUnit: resolveTemperatureUnit(
      effectiveDailyForecastSource[0]?.templow_unit,
      effectiveDailyForecastSource[0]?.native_templow_unit,
      effectiveDailyForecastSource[0]?.temperature_unit,
      effectiveDailyForecastSource[0]?.native_temperature_unit,
      entityTemperatureUnit
    ),
    forecastMode: effectiveForecastMode,
    forecast,
    weatherModel: normalizeWeatherModel({
      entityId,
      entity,
      name,
      location: weatherLocation,
      forecasts: {
        daily: storedForecasts?.daily,
        hourly: storedForecasts?.hourly,
        twice_daily: storedForecasts?.twice_daily,
      },
      sunEntity,
    }),
  };
}
