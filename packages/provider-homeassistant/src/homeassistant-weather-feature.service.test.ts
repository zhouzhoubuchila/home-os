import { describe, expect, it, vi } from 'vitest';
import { homeAssistantWeatherFeatureService } from './homeassistant-weather-feature.service';

describe('homeAssistantWeatherFeatureService', () => {
  it('uses the modern forecast subscription command for all forecast types', async () => {
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn().mockImplementation(async (callback, message) => {
      callback({ forecast: [{ datetime: '2026-09-21T12:00:00Z', temperature: 18 }] });
      expect(message).toMatchObject({
        type: 'weather/subscribe_forecast',
        forecast_type: 'twice_daily',
        entity_id: 'weather.home',
      });
      return unsubscribe;
    });
    const listener = vi.fn();

    const subscribeForecast = homeAssistantWeatherFeatureService.subscribeForecast;
    if (!subscribeForecast) throw new Error('subscribeForecast is unavailable');
    const stop = await subscribeForecast(
      'weather.home',
      'twice_daily',
      listener,
      { messageClient: { sendMessagePromise: vi.fn(), subscribeMessage } }
    );

    expect(listener).toHaveBeenCalledWith([{ datetime: '2026-09-21T12:00:00Z', temperature: 18 }]);
    expect(stop).toBe(unsubscribe);
  });

  it('falls back to get_forecasts through the existing action contract', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      response: { 'weather.home': { forecast: [{ condition: 'rainy' }] } },
    });

    await expect(
      homeAssistantWeatherFeatureService.getForecast('weather.home', 'hourly', {
        messageClient: { sendMessagePromise },
      })
    ).resolves.toEqual([{ condition: 'rainy' }]);
    expect(sendMessagePromise).toHaveBeenCalledWith(expect.objectContaining({
      service_data: { type: 'hourly' },
    }));
  });
});
