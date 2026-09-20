import type { ProviderWeatherFeatureService } from '@navet/core/provider-feature-services';
import { getHomeAssistantConnection } from './homeassistant-service-bridge';

type WeatherForecastEntry = Record<string, unknown>;

type WeatherForecastServicePayload = {
  response?: Record<
    string,
    {
      forecast?: WeatherForecastEntry[];
    }
  >;
};

type WeatherForecastServiceEnvelope = WeatherForecastServicePayload & {
  result?: WeatherForecastServicePayload;
};

function getActiveMessageClient(
  messageClient?: {
    sendMessagePromise<T>(message: unknown): Promise<T>;
    subscribeMessage?<T>(callback: (event: T) => void, message: unknown): Promise<() => void>;
  } | null
) {
  return messageClient ?? getHomeAssistantConnection();
}

export const homeAssistantWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient) {
      return [];
    }

    const response = (await messageClient.sendMessagePromise({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: entityId },
      service_data: { type },
      return_response: true,
    })) as WeatherForecastServiceEnvelope;

    return (
      response.response?.[entityId]?.forecast ??
      response.result?.response?.[entityId]?.forecast ??
      []
    );
  },
  async subscribeForecast(entityId, type, listener, options) {
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient?.subscribeMessage) {
      throw new Error('Home Assistant forecast subscriptions are unavailable');
    }

    return await messageClient.subscribeMessage(
      (event: WeatherForecastServiceEnvelope & { forecast?: WeatherForecastEntry[] }) => {
        const forecast =
          event.forecast ??
          event.response?.[entityId]?.forecast ??
          event.result?.response?.[entityId]?.forecast ??
          [];
        listener(forecast);
      },
      {
        type: 'weather/subscribe_forecast',
        forecast_type: type,
        entity_id: entityId,
      }
    );
  },
};
