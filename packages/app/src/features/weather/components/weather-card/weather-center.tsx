import { useI18n } from '@navet/app/hooks';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { WeatherModel } from '@navet/app/features/weather/model/weather-model';
import { WeatherChart, type WeatherChartMetric } from './weather-chart';
import {
  formatWeatherTemperature,
  formatWeatherTemperatureValue,
  resolveWeatherTemperatureUnit,
} from './weather-temperature';
import { formatWeatherConditionLabel, WeatherIcon } from './weather-icon';

type WeatherTheme = 'light' | 'dark' | 'black' | 'glass';

export function WeatherCenter({
  model,
  title,
  theme,
  locale,
  onClose,
}: {
  model: WeatherModel;
  title: string;
  theme: WeatherTheme;
  locale?: string;
  onClose: () => void;
}) {
  const { t, locale: currentLocale } = useI18n();
  const hourly = model.forecast.hourly;
  const daily = model.forecast.daily.length > 0 ? model.forecast.daily : model.forecast.twiceDaily;
  const [metric, setMetric] = useState<WeatherChartMetric>('temperature');
  const displayTemperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const sourceTemperatureUnit =
    resolveWeatherTemperatureUnit(model.current.temperatureUnit) ?? displayTemperatureUnit;
  const resolvedLocale = locale ?? currentLocale;
  const isZh = resolvedLocale.toLowerCase().startsWith('zh');
  const light = theme === 'light';
  const formatUnit = (value: number, unit?: string) => `${value}${unit ? ` ${unit}` : ''}`;
  const labels = {
    center: isZh ? '天气中心' : 'Weather Center',
    feelsLike: t('weather.metric.feelsLike'),
    humidity: t('weather.humidity'),
    wind: t('weather.wind'),
    pressure: t('weather.pressure'),
    visibility: isZh ? '能见度' : 'Visibility',
    dewPoint: isZh ? '露点' : 'Dew point',
    clouds: t('weather.cloudCover'),
    chart: isZh ? '天气趋势' : 'Weather chart',
    chartTemperature: isZh ? '温度 + 降水' : 'Temperature + precipitation',
    chartFeelsLike: isZh ? '体感温度' : 'Feels like',
    chartHumidity: isZh ? '湿度' : 'Humidity',
    chartPressure: isZh ? '气压' : 'Pressure',
    chartUv: isZh ? '紫外线' : 'UV',
    dailyForecast: isZh ? '每日预报' : 'Daily forecast',
    sunrise: isZh ? '日出' : 'Sunrise',
    sunset: isZh ? '日落' : 'Sunset',
  };
  const shell = light
    ? 'border-slate-200 bg-white text-slate-900'
    : theme === 'glass'
      ? 'border-white/20 bg-slate-900/90 text-white backdrop-blur-xl'
      : theme === 'black'
        ? 'border-white/10 bg-black text-white'
        : 'border-white/10 bg-slate-950 text-white';
  const panel = light ? 'bg-slate-100' : 'bg-white/5';
  const muted = light ? 'text-slate-500' : 'text-white/60';
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border p-5 shadow-2xl outline-none ${shell}`}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{labels.center}</Dialog.Description>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-[0.18em] ${muted}`}>{labels.center}</div>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <Dialog.Close asChild>
            <button type="button" aria-label={isZh ? '关闭天气中心' : 'Close weather center'} className={`rounded-full p-2 ${muted} hover:bg-black/10`}>
            <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className={`rounded-2xl p-4 ${panel}`}>
            <div className="flex items-center gap-4">
              <WeatherIcon condition={model.current.condition ?? 'cloudy'} isNight={model.current.isDay === false} animated className="h-16 w-16" />
              <div>
                <div className="text-5xl font-semibold">
                  {formatWeatherTemperature(
                    model.current.temperature,
                    sourceTemperatureUnit,
                    displayTemperatureUnit
                  ) || '—'}
                </div>
                <div className={`mt-1 ${muted}`}>
                  {formatWeatherConditionLabel(model.current.condition ?? 'cloudy', resolvedLocale)}
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {model.current.apparentTemperature !== undefined ? <div>{labels.feelsLike} <strong>{formatWeatherTemperature(model.current.apparentTemperature, sourceTemperatureUnit, displayTemperatureUnit)}</strong></div> : null}
              {model.current.humidity !== undefined ? <div>{labels.humidity} <strong>{model.current.humidity}%</strong></div> : null}
              {model.current.windSpeed !== undefined ? <div>{labels.wind} <strong>{formatUnit(model.current.windSpeed, model.current.windSpeedUnit)}</strong></div> : null}
              {model.current.pressure !== undefined ? <div>{labels.pressure} <strong>{formatUnit(model.current.pressure, model.current.pressureUnit)}</strong></div> : null}
              {model.current.visibility !== undefined ? <div>{labels.visibility} <strong>{formatUnit(model.current.visibility, model.current.visibilityUnit)}</strong></div> : null}
              {model.current.dewPoint !== undefined ? <div>{labels.dewPoint} <strong>{formatWeatherTemperature(model.current.dewPoint, sourceTemperatureUnit, displayTemperatureUnit)}</strong></div> : null}
              {model.current.uvIndex !== undefined ? <div>UV <strong>{model.current.uvIndex}</strong></div> : null}
              {model.current.cloudCoverage !== undefined ? <div>{labels.clouds} <strong>{model.current.cloudCoverage}%</strong></div> : null}
            </div>
          </section>
          <section className={`rounded-2xl p-4 ${panel}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className={`text-sm font-medium ${muted}`}>{labels.chart}</div>
              <select
                value={metric}
                onChange={(event) => setMetric(event.target.value as WeatherChartMetric)}
                className={`rounded-lg px-2 py-1 text-xs ${light ? 'bg-white text-slate-700' : 'bg-white/10 text-white'}`}
                aria-label="Chart metric"
              >
                <option value="temperature">{labels.chartTemperature}</option>
                <option value="apparentTemperature">{labels.chartFeelsLike}</option>
                <option value="humidity">{labels.chartHumidity}</option>
                <option value="pressure">{labels.chartPressure}</option>
                <option value="uvIndex">{labels.chartUv}</option>
              </select>
            </div>
            <WeatherChart
              forecast={hourly.slice(0, 24)}
              metric={metric}
              theme={theme}
              sourceTemperatureUnit={sourceTemperatureUnit}
              displayTemperatureUnit={displayTemperatureUnit}
              metricLabels={labels}
            />
          </section>
        </div>
        <section className={`mt-5 rounded-2xl p-4 ${panel}`}>
          <div className={`mb-3 text-sm font-medium ${muted}`}>{labels.dailyForecast}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
            {daily.slice(0, 7).map((point) => (
              <div key={point.datetime} className={`rounded-xl p-3 text-center text-sm ${light ? 'bg-white' : 'bg-white/5'}`}>
                <div className={muted}>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(point.datetime))}</div>
                <WeatherIcon condition={point.condition ?? 'cloudy'} isNight={point.isDaytime === false} className="mx-auto my-2 h-8 w-8" />
                <div>{formatWeatherTemperature(point.temperature, point.temperatureUnit ?? sourceTemperatureUnit, displayTemperatureUnit) || '—'}</div>
                {point.temperatureLow !== undefined ? <div className={muted}>{formatWeatherTemperatureValue(point.temperatureLow, point.temperatureUnit ?? sourceTemperatureUnit, displayTemperatureUnit)}</div> : null}
                {point.precipitationProbability !== undefined ? <div className="mt-1 text-xs text-sky-500">{point.precipitationProbability}%</div> : null}
              </div>
            ))}
          </div>
        </section>
        {model.current.sunrise || model.current.sunset ? (
          <div className={`mt-4 text-sm ${muted}`}>{labels.sunrise} {model.current.sunrise ?? '—'} · {labels.sunset} {model.current.sunset ?? '—'}</div>
        ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
