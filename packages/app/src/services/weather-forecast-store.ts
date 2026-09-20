import type { PlatformWeatherForecastEntry } from '@navet/app/platform/provider-feature-models';
import { integrationWeatherFeatureService } from './integration-weather-feature.service';

type ForecastType = 'daily' | 'hourly' | 'twice_daily';
type Listener = () => void;

interface ForecastRecord {
  data: PlatformWeatherForecastEntry[];
  updatedAt?: number;
  loading: boolean;
  error: unknown;
  listeners: Set<Listener>;
  stop?: () => void;
  timer?: ReturnType<typeof setInterval>;
  visibilityListener?: () => void;
  starting?: boolean;
  generation: number;
}

const records = new Map<string, ForecastRecord>();
const REFRESH_MS = 15 * 60 * 1000;

function key(entityId: string, type: ForecastType) {
  return `${entityId}:${type}`;
}

function notify(record: ForecastRecord) {
  record.listeners.forEach((listener) => {
    listener();
  });
}

function getRecord(entityId: string, type: ForecastType): ForecastRecord {
  const recordKey = key(entityId, type);
  const existing = records.get(recordKey);
  if (existing) return existing;
  const created: ForecastRecord = {
    data: [],
    loading: false,
    error: null,
    listeners: new Set(),
    generation: 0,
  };
  records.set(recordKey, created);
  return created;
}

async function loadFallback(entityId: string, type: ForecastType, record: ForecastRecord) {
  try {
    const data = await integrationWeatherFeatureService.getForecast(entityId, type);
    record.data = data;
    record.updatedAt = Date.now();
    record.error = null;
  } catch (error) {
    record.error = error;
  } finally {
    record.loading = false;
    notify(record);
  }
}

async function startRecord(entityId: string, type: ForecastType, record: ForecastRecord) {
  if (record.starting || record.stop || record.timer) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  record.starting = true;
  const generation = ++record.generation;
  record.loading = record.data.length === 0;
  notify(record);
  try {
    const subscribeForecast = integrationWeatherFeatureService.subscribeForecast;
    if (!subscribeForecast) throw new Error('Forecast subscriptions are unavailable');
    const stop = await subscribeForecast(
      entityId,
      type,
      (data) => {
        if (generation !== record.generation) return;
        record.data = data;
        record.updatedAt = Date.now();
        record.error = null;
        record.loading = false;
        notify(record);
      }
    );
    if (generation !== record.generation || record.listeners.size === 0) {
      stop();
      return;
    }
    record.stop = stop;
    // HA normally emits an initial event, but the action fallback also makes
    // this safe for older bridges that only emit after the next update.
    if (record.data.length === 0) {
      await loadFallback(entityId, type, record);
    }
  } catch {
    await loadFallback(entityId, type, record);
    if (
      record.listeners.size > 0 &&
      (typeof document === 'undefined' || document.visibilityState !== 'hidden')
    ) {
      record.timer = setInterval(() => void loadFallback(entityId, type, record), REFRESH_MS);
    }
  } finally {
    record.starting = false;
  }
}

function stopRecord(record: ForecastRecord) {
  record.generation += 1;
  record.stop?.();
  record.stop = undefined;
  if (record.timer) clearInterval(record.timer);
  record.timer = undefined;
}

function attachVisibility(record: ForecastRecord, entityId: string, type: ForecastType) {
  if (typeof document === 'undefined' || record.visibilityListener) return;
  const listener = () => {
    if (document.visibilityState === 'hidden') {
      stopRecord(record);
    } else if (record.listeners.size > 0) {
      void startRecord(entityId, type, record);
    }
  };
  record.visibilityListener = listener;
  document.addEventListener('visibilitychange', listener);
}

function detachVisibility(record: ForecastRecord) {
  if (typeof document === 'undefined' || !record.visibilityListener) return;
  document.removeEventListener('visibilitychange', record.visibilityListener);
  record.visibilityListener = undefined;
}

export const weatherForecastStore = {
  getSnapshot(entityId: string, type: ForecastType) {
    return getRecord(entityId, type);
  },
  subscribe(entityId: string, type: ForecastType, listener: Listener) {
    const record = getRecord(entityId, type);
    record.listeners.add(listener);
    if (record.listeners.size === 1) {
      attachVisibility(record, entityId, type);
      void startRecord(entityId, type, record);
    }
    return () => {
      record.listeners.delete(listener);
      if (record.listeners.size === 0) {
        stopRecord(record);
        detachVisibility(record);
      }
    };
  },
};
