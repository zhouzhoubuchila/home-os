import type { WeatherForecastPoint, WeatherModel } from '@navet/app/features/weather/model/weather-model';
import {
  getLunarWeatherChipClassName,
  getLunarWeatherPanelClassName,
  LUNAR_WEATHER_CARD_TOKENS,
} from '@navet/app/components/shared/theme/lunar-weather-card-tokens';
import { useI18n } from '@navet/app/hooks';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { formatClock, formatDaylight } from '@navet/app/hooks/entity-utils';
import type { TemperatureUnit } from '@navet/app/utils/temperature';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { WeatherChart, type WeatherChartMetric, type WeatherChartMode } from './weather-chart';
import {
  formatWeatherTemperature,
  formatWeatherTemperatureValue,
  resolveWeatherTemperatureUnit,
} from './weather-temperature';
import { formatWeatherConditionLabel, WeatherIcon } from './weather-icon';

type WeatherTheme = 'light' | 'dark' | 'black' | 'glass';

interface ForecastStripProps {
  forecast: WeatherForecastPoint[];
  mode: WeatherChartMode;
  locale: string;
  use24HourTime: boolean;
  sourceTemperatureUnit?: TemperatureUnit;
  displayTemperatureUnit: TemperatureUnit;
  theme: WeatherTheme;
  mutedClassName: string;
  primaryClassName: string;
  labels: {
    precipitation: string;
    today: string;
  };
}

function ForecastStrip({
  forecast,
  mode,
  locale,
  use24HourTime,
  sourceTemperatureUnit,
  displayTemperatureUnit,
  theme,
  mutedClassName,
  primaryClassName,
  labels,
}: ForecastStripProps) {
  return (
    <div className="grid auto-cols-[7rem] grid-flow-col gap-2 overflow-x-auto pb-1">
      {forecast.map((point, index) => {
        const date = new Date(point.datetime);
        const label = Number.isNaN(date.getTime())
          ? `+${index + 1}`
          : new Intl.DateTimeFormat(locale, mode === 'hourly'
              ? { hour: '2-digit', minute: '2-digit', hour12: !use24HourTime }
              : { weekday: 'short' }
            ).format(date);
        const high = formatWeatherTemperature(
          point.temperature,
          point.temperatureUnit ?? sourceTemperatureUnit,
          displayTemperatureUnit
        );
        const low = formatWeatherTemperatureValue(
          point.temperatureLow,
          point.temperatureUnit ?? sourceTemperatureUnit,
          displayTemperatureUnit
        );
        return (
          <div
            key={`${point.datetime}-${index}`}
            className={`${getLunarWeatherPanelClassName(theme, true)} min-w-0 p-3 text-center text-sm`}
          >
            <div className={mutedClassName}>{index === 0 && mode === 'hourly' ? labels.today : label}</div>
            <WeatherIcon
              condition={point.condition ?? 'cloudy'}
              isNight={point.isDaytime === false}
              theme={theme}
              className="mx-auto my-2 h-9 w-9"
            />
            <div className={primaryClassName}>{high || '—'}</div>
            {low ? <div className={mutedClassName}>{low}</div> : null}
            {point.precipitationProbability !== undefined ? (
              <div className="mt-1 text-xs text-sky-500">{Math.round(point.precipitationProbability)}%</div>
            ) : point.precipitationAmount !== undefined && point.precipitationAmount > 0 ? (
              <div className="mt-1 text-xs text-sky-500">
                {labels.precipitation} {point.precipitationAmount}{point.precipitationUnit ? ` ${point.precipitationUnit}` : ''}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

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
  const resolvedLocale = locale ?? currentLocale;
  const isZh = resolvedLocale.toLowerCase().startsWith('zh');
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);
  const displayTemperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const sourceTemperatureUnit =
    resolveWeatherTemperatureUnit(model.current.temperatureUnit) ?? displayTemperatureUnit;
  const hourly = model.forecast.hourly;
  const daily = model.forecast.daily.length > 0 ? model.forecast.daily : model.forecast.twiceDaily;
  const [forecastMode, setForecastMode] = useState<WeatherChartMode>(hourly.length > 0 ? 'hourly' : 'daily');
  const [metric, setMetric] = useState<WeatherChartMetric>('temperature');
  const activeForecast = forecastMode === 'hourly' ? hourly : daily;
  const availableTabs = useMemo(
    () => ({ hourly: hourly.length > 0, daily: daily.length > 0 }),
    [daily.length, hourly.length]
  );
  const availableMetrics = useMemo(() => {
    const metricKeys: WeatherChartMetric[] = [
      'temperature',
      'apparentTemperature',
      'humidity',
      'pressure',
      'uvIndex',
    ];
    return metricKeys.filter((key) => activeForecast.some((point) => typeof point[key] === 'number'));
  }, [activeForecast]);
  useEffect(() => {
    if (!availableTabs[forecastMode]) {
      setForecastMode(availableTabs.hourly ? 'hourly' : 'daily');
    }
  }, [availableTabs, forecastMode]);
  useEffect(() => {
    if (!availableMetrics.includes(metric)) {
      setMetric('temperature');
    }
  }, [availableMetrics, metric]);

  const labels = {
    center: isZh ? '天气中心' : 'Weather Center',
    current: isZh ? '当前天气' : 'Current weather',
    feelsLike: t('weather.metric.feelsLike'),
    humidity: t('weather.humidity'),
    wind: t('weather.wind'),
    pressure: t('weather.pressure'),
    visibility: isZh ? '能见度' : 'Visibility',
    dewPoint: isZh ? '露点' : 'Dew point',
    clouds: t('weather.cloudCover'),
    uv: t('weather.uvIndex'),
    chart: isZh ? '天气趋势' : 'Weather chart',
    chartTemperature: isZh ? '温度 + 降水' : 'Temperature + precipitation',
    chartFeelsLike: isZh ? '体感温度' : 'Feels like',
    chartHumidity: isZh ? '湿度' : 'Humidity',
    chartPressure: isZh ? '气压' : 'Pressure',
    chartUv: isZh ? '紫外线' : 'UV',
    high: isZh ? '最高' : 'High',
    low: isZh ? '最低' : 'Low',
    forecast: isZh ? '预报' : 'Forecast',
    hourly: isZh ? '小时预报' : 'Hourly forecast',
    daily: isZh ? '每日预报' : 'Daily forecast',
    today: isZh ? '现在' : 'Now',
    precipitation: isZh ? '降水' : 'Precipitation',
    sunrise: isZh ? '日出' : 'Sunrise',
    sunset: isZh ? '日落' : 'Sunset',
    noForecast: isZh ? '暂无预报数据' : 'No forecast data available',
  };
  const today = daily[0];
  const formatSunTime = (value?: string) =>
    value ? formatClock(value, resolvedLocale, use24HourTime) : '—';
  const daylight = model.current.daylight ?? (model.current.sunrise && model.current.sunset
    ? formatDaylight(model.current.sunrise, model.current.sunset)
    : undefined);
  const shell = theme === 'light'
    ? 'rounded-3xl border-sky-200/90 bg-[#edf4ff]/96 text-slate-900 shadow-[0_24px_70px_-36px_rgba(30,64,175,0.45)]'
    : theme === 'glass'
      ? 'rounded-3xl border-white/18 bg-slate-950/82 text-white shadow-[0_24px_70px_-38px_rgba(2,8,20,0.75)] backdrop-blur-2xl'
      : theme === 'black'
        ? 'rounded-3xl border-white/10 bg-black text-white shadow-[0_24px_64px_-38px_rgba(0,0,0,0.9)]'
        : 'rounded-3xl border-white/12 bg-slate-950/94 text-white shadow-[0_24px_64px_-38px_rgba(2,8,20,0.8)]';
  const panel = getLunarWeatherPanelClassName(theme);
  const muted = theme === 'light' ? 'text-slate-500' : 'text-white/60';
  const primary = theme === 'light' ? 'text-slate-900' : 'text-white';
  const chartLabels = {
    temperature: labels.chartTemperature,
    apparentTemperature: labels.chartFeelsLike,
    humidity: labels.chartHumidity,
    pressure: labels.chartPressure,
    uvIndex: labels.chartUv,
    precipitation: labels.precipitation,
    high: labels.high,
    low: labels.low,
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border p-5 shadow-2xl outline-none ${shell}`}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{labels.center}</Dialog.Description>
          <div className={`${LUNAR_WEATHER_CARD_TOKENS.header} mb-5 items-start justify-between gap-4`}>
            <div>
              <div className={`${LUNAR_WEATHER_CARD_TOKENS.headerEyebrow} ${muted}`}>{labels.center}</div>
              <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={isZh ? '关闭天气中心' : 'Close weather center'}
                className={`${LUNAR_WEATHER_CARD_TOKENS.headerControl} ${muted}`}
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <section className={panel}>
              <div className={`mb-1 text-xs uppercase tracking-[0.16em] ${muted}`}>{labels.current}</div>
              <div className="flex items-center gap-4">
                <WeatherIcon
                  condition={model.current.condition ?? 'cloudy'}
                  isNight={model.current.isDay === false}
                  theme={theme}
                  animated
                  className="h-16 w-16"
                />
                <div>
                  <div className="text-5xl font-semibold">
                    {formatWeatherTemperature(model.current.temperature, sourceTemperatureUnit, displayTemperatureUnit) || '—'}
                  </div>
                  <div className={`mt-1 ${muted}`}>
                    {formatWeatherConditionLabel(model.current.condition ?? 'cloudy', resolvedLocale)}
                  </div>
                  {today?.temperature !== undefined || today?.temperatureLow !== undefined ? (
                    <div className={`mt-2 text-sm ${muted}`}>
                      {today.temperature !== undefined ? `${labels.high} ${formatWeatherTemperature(today.temperature, today.temperatureUnit ?? sourceTemperatureUnit, displayTemperatureUnit)}` : null}
                      {today.temperature !== undefined && today.temperatureLow !== undefined ? ' · ' : null}
                      {today.temperatureLow !== undefined ? `${labels.low} ${formatWeatherTemperature(today.temperatureLow, today.temperatureUnit ?? sourceTemperatureUnit, displayTemperatureUnit)}` : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {model.current.apparentTemperature !== undefined ? <div>{labels.feelsLike} <strong>{formatWeatherTemperature(model.current.apparentTemperature, sourceTemperatureUnit, displayTemperatureUnit)}</strong></div> : null}
                {model.current.humidity !== undefined ? <div>{labels.humidity} <strong>{model.current.humidity}%</strong></div> : null}
                {model.current.windSpeed !== undefined ? <div>{labels.wind} <strong>{model.current.windSpeed} {model.current.windSpeedUnit ?? 'km/h'}</strong></div> : null}
                {model.current.pressure !== undefined ? <div>{labels.pressure} <strong>{model.current.pressure} {model.current.pressureUnit ?? 'hPa'}</strong></div> : null}
                {model.current.visibility !== undefined ? <div>{labels.visibility} <strong>{model.current.visibility} {model.current.visibilityUnit ?? 'km'}</strong></div> : null}
                {model.current.dewPoint !== undefined ? <div>{labels.dewPoint} <strong>{formatWeatherTemperature(model.current.dewPoint, sourceTemperatureUnit, displayTemperatureUnit)}</strong></div> : null}
                {model.current.uvIndex !== undefined ? <div>{labels.uv} <strong>{model.current.uvIndex}</strong></div> : null}
                {model.current.cloudCoverage !== undefined ? <div>{labels.clouds} <strong>{model.current.cloudCoverage}%</strong></div> : null}
              </div>
            </section>

            <section className={panel}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className={`text-sm font-medium ${muted}`}>{labels.chart}</div>
                <select
                  value={availableMetrics.includes(metric) ? metric : 'temperature'}
                  onChange={(event) => setMetric(event.target.value as WeatherChartMetric)}
                  className={getLunarWeatherChipClassName(theme, false)}
                  aria-label={isZh ? '选择天气指标' : 'Chart metric'}
                >
                  {availableMetrics.includes('temperature') ? <option value="temperature">{labels.chartTemperature}</option> : null}
                  {availableMetrics.includes('apparentTemperature') ? <option value="apparentTemperature">{labels.chartFeelsLike}</option> : null}
                  {availableMetrics.includes('humidity') ? <option value="humidity">{labels.chartHumidity}</option> : null}
                  {availableMetrics.includes('pressure') ? <option value="pressure">{labels.chartPressure}</option> : null}
                  {availableMetrics.includes('uvIndex') ? <option value="uvIndex">{labels.chartUv}</option> : null}
                </select>
              </div>
              {activeForecast.length > 0 ? (
                <WeatherChart
                  forecast={activeForecast.slice(0, forecastMode === 'hourly' ? 24 : 7)}
                  metric={availableMetrics.includes(metric) ? metric : 'temperature'}
                  mode={forecastMode}
                  theme={theme}
                  locale={resolvedLocale}
                  use24HourTime={use24HourTime}
                  sourceTemperatureUnit={sourceTemperatureUnit}
                  displayTemperatureUnit={displayTemperatureUnit}
                  metricLabels={chartLabels}
                />
              ) : <div className={`flex h-48 items-center justify-center text-sm ${muted}`}>{labels.noForecast}</div>}
            </section>
          </div>

          <section className={`mt-5 ${panel}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className={`text-sm font-medium ${muted}`}>{labels.forecast}</div>
              <div className="flex gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5">
                {availableTabs.hourly ? (
                  <button
                    type="button"
                    className={getLunarWeatherChipClassName(theme, forecastMode === 'hourly')}
                    onClick={() => setForecastMode('hourly')}
                  >
                    {labels.hourly}
                  </button>
                ) : null}
                {availableTabs.daily ? (
                  <button
                    type="button"
                    className={getLunarWeatherChipClassName(theme, forecastMode === 'daily')}
                    onClick={() => setForecastMode('daily')}
                  >
                    {labels.daily}
                  </button>
                ) : null}
              </div>
            </div>
            {activeForecast.length > 0 ? (
              <ForecastStrip
                forecast={activeForecast.slice(0, forecastMode === 'hourly' ? 24 : 7)}
                mode={forecastMode}
                locale={resolvedLocale}
                use24HourTime={use24HourTime}
                sourceTemperatureUnit={sourceTemperatureUnit}
                displayTemperatureUnit={displayTemperatureUnit}
                theme={theme}
                mutedClassName={muted}
                primaryClassName={primary}
                labels={{ precipitation: labels.precipitation, today: labels.today }}
              />
            ) : <p className={`text-sm ${muted}`}>{labels.noForecast}</p>}
          </section>

          {forecastMode === 'hourly' && daily.length > 0 ? (
            <section className={`mt-5 ${panel}`}>
              <div className={`mb-3 text-sm font-medium ${muted}`}>{labels.daily}</div>
              <ForecastStrip
                forecast={daily.slice(0, 7)}
                mode="daily"
                locale={resolvedLocale}
                use24HourTime={use24HourTime}
                sourceTemperatureUnit={sourceTemperatureUnit}
                displayTemperatureUnit={displayTemperatureUnit}
                theme={theme}
                mutedClassName={muted}
                primaryClassName={primary}
                labels={{ precipitation: labels.precipitation, today: labels.today }}
              />
            </section>
          ) : null}

          {model.current.sunrise || model.current.sunset ? (
            <div className={`mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm ${muted}`}>
              <span>{labels.sunrise} {formatSunTime(model.current.sunrise)}</span>
              <span>{labels.sunset} {formatSunTime(model.current.sunset)}</span>
              {daylight && daylight !== '--' ? <span>{isZh ? '日照' : 'Daylight'} {daylight}</span> : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
