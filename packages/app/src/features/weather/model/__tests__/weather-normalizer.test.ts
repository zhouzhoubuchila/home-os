import { describe, expect, it } from 'vitest';
import {
  formatWeatherTemperature,
  formatWeatherTemperatureValue,
} from '../../components/weather-card/weather-temperature';
import { normalizeWeatherModel } from '../weather-normalizer';
import { getDailyForecastType, supportsForecastType } from '../weather-model';

const entity = {
  state: 'partlycloudy',
  attributes: {
    supported_features: 7,
    temperature: 0,
    humidity: 0,
    precipitation: 0,
    precipitation_probability: 0,
  },
};

describe('normalizeWeatherModel', () => {
  it('maps Home Assistant forecast capability flags without requesting unsupported types', () => {
    expect(supportsForecastType(1, 'daily')).toBe(true);
    expect(supportsForecastType(1, 'hourly')).toBe(false);
    expect(supportsForecastType(4, 'twice_daily')).toBe(true);
    expect(getDailyForecastType({ hourly: false, daily: false, twiceDaily: true })).toBe('twice_daily');
  });

  it('preserves zero values and keeps amount separate from probability', () => {
    const model = normalizeWeatherModel({
      entityId: 'weather.home',
      entity,
      forecasts: {
        daily: [{ datetime: '2026-09-21T12:00:00Z', temperature: 0, precipitation: 0, precipitation_probability: 0 }],
      },
    });

    expect(model.current.temperature).toBe(0);
    expect(model.current.precipitationAmount).toBe(0);
    expect(model.current.precipitationProbability).toBe(0);
    expect(model.forecast.daily[0]).toMatchObject({
      temperature: 0,
      precipitationAmount: 0,
      precipitationProbability: 0,
    });
  });

  it('normalizes twice-daily forecasts and sun context without requiring dashboard entities', () => {
    const model = normalizeWeatherModel({
      entityId: 'weather.home',
      entity: { state: 'sunny', attributes: {} },
      forecasts: {
        twice_daily: [{ datetime: '2026-09-21T08:00:00Z', condition: 'sunny', is_daytime: true }],
      },
      sunEntity: {
        state: 'above_horizon',
        attributes: { next_rising: '2026-09-22T05:00:00Z', next_setting: '2026-09-21T18:00:00Z' },
      },
    });

    expect(model.capabilities.twiceDaily).toBe(true);
    expect(model.forecast.twiceDaily[0].isDaytime).toBe(true);
    expect(model.current).toMatchObject({ isDay: true, sunrise: '2026-09-22T05:00:00Z' });
  });

  it('keeps wind bearing, units, and legacy forecast fallback intact', () => {
    const model = normalizeWeatherModel({
      entityId: 'weather.home',
      entity: {
        state: 'cloudy',
        attributes: {
          wind_bearing: 'NE',
          wind_speed: 12,
          wind_speed_unit: 'km/h',
          forecast: [{ datetime: '2026-09-22T12:00:00Z', temperature: 21 }],
        },
      },
    });

    expect(model.current).toMatchObject({ windBearing: 'NE', windSpeed: 12, windSpeedUnit: 'km/h' });
    expect(model.forecast.daily[0].temperature).toBe(21);
  });

  it('leaves unavailable values undefined instead of manufacturing zeroes', () => {
    const model = normalizeWeatherModel({
      entityId: 'weather.home',
      entity: { state: 'unknown', attributes: {} },
    });

    expect(model.current.temperature).toBeUndefined();
    expect(model.current.humidity).toBeUndefined();
    expect(model.current.precipitationAmount).toBeUndefined();
  });

  it('normalizes Celsius units at the model boundary without shifting temperatures', () => {
    const model = normalizeWeatherModel({
      entityId: 'weather.home',
      entity: {
        state: 'sunny',
        attributes: { temperature: 23, temperature_unit: '°C' },
      },
      forecasts: {
        daily: [{ datetime: '2026-09-21T12:00:00Z', temperature: 29 }],
      },
    });

    expect(model.current.temperatureUnit).toBe('celsius');
    expect(formatWeatherTemperature(model.current.temperature, model.current.temperatureUnit, 'celsius')).toBe('23 °C');
    expect(formatWeatherTemperatureValue(model.forecast.daily[0].temperature, model.forecast.daily[0].temperatureUnit, 'celsius')).toBe('29 °C');
  });

  it('converts Fahrenheit source values after normalization', () => {
    const model = normalizeWeatherModel({
      entityId: 'weather.home',
      entity: {
        state: 'sunny',
        attributes: { temperature: 73.4, temperature_unit: '°F' },
      },
    });

    expect(model.current.temperatureUnit).toBe('fahrenheit');
    expect(formatWeatherTemperature(model.current.temperature, model.current.temperatureUnit, 'celsius')).toBe('23 °C');
  });
});
