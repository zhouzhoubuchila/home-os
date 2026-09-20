import { afterEach, describe, expect, it, vi } from 'vitest';

const { subscribeForecastMock, getForecastMock } = vi.hoisted(() => ({
  subscribeForecastMock: vi.fn(),
  getForecastMock: vi.fn(),
}));

vi.mock('../integration-weather-feature.service', () => ({
  integrationWeatherFeatureService: {
    subscribeForecast: subscribeForecastMock,
    getForecast: getForecastMock,
  },
}));

import { weatherForecastStore } from '../weather-forecast-store';

describe('weatherForecastStore', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shares one live forecast source between subscribers', async () => {
    const stop = vi.fn();
    subscribeForecastMock.mockResolvedValue(stop);
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribeFirst = weatherForecastStore.subscribe('weather.shared', 'daily', first);
    const unsubscribeSecond = weatherForecastStore.subscribe('weather.shared', 'daily', second);
    await Promise.resolve();

    expect(subscribeForecastMock).toHaveBeenCalledTimes(1);
    unsubscribeFirst();
    expect(stop).not.toHaveBeenCalled();
    unsubscribeSecond();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
