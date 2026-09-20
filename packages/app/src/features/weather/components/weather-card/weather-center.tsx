import { X } from 'lucide-react';
import { useState } from 'react';
import { getTemperatureUnitSymbol, normalizeTemperatureUnit } from '@navet/app/utils/temperature';
import type { WeatherModel } from '@navet/app/features/weather/model/weather-model';
import { WeatherChart, type WeatherChartMetric } from './weather-chart';
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
  const hourly = model.forecast.hourly;
  const daily = model.forecast.daily.length > 0 ? model.forecast.daily : model.forecast.twiceDaily;
  const [metric, setMetric] = useState<WeatherChartMetric>('temperature');
  const light = theme === 'light';
  const temperatureUnit = normalizeTemperatureUnit(model.current.temperatureUnit);
  const temperatureSuffix = temperatureUnit ? ` ${getTemperatureUnitSymbol(temperatureUnit)}` : '°';
  const formatUnit = (value: number, unit?: string) => `${value}${unit ? ` ${unit}` : ''}`;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border p-5 shadow-2xl ${shell}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-[0.18em] ${muted}`}>Weather Center</div>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close weather center" className={`rounded-full p-2 ${muted} hover:bg-black/10`}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className={`rounded-2xl p-4 ${panel}`}>
            <div className="flex items-center gap-4">
              <WeatherIcon condition={model.current.condition ?? 'cloudy'} isNight={model.current.isDay === false} animated className="h-16 w-16" />
              <div>
                <div className="text-5xl font-semibold">{model.current.temperature ?? '—'}{temperatureSuffix}</div>
                <div className={`mt-1 ${muted}`}>{formatWeatherConditionLabel(model.current.condition ?? 'cloudy', locale)}</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {model.current.apparentTemperature !== undefined ? <div>Feels like <strong>{model.current.apparentTemperature}{temperatureSuffix}</strong></div> : null}
              {model.current.humidity !== undefined ? <div>Humidity <strong>{model.current.humidity}%</strong></div> : null}
              {model.current.windSpeed !== undefined ? <div>Wind <strong>{formatUnit(model.current.windSpeed, model.current.windSpeedUnit)}</strong></div> : null}
              {model.current.pressure !== undefined ? <div>Pressure <strong>{formatUnit(model.current.pressure, model.current.pressureUnit)}</strong></div> : null}
              {model.current.visibility !== undefined ? <div>Visibility <strong>{formatUnit(model.current.visibility, model.current.visibilityUnit)}</strong></div> : null}
              {model.current.dewPoint !== undefined ? <div>Dew point <strong>{model.current.dewPoint}{temperatureSuffix}</strong></div> : null}
              {model.current.uvIndex !== undefined ? <div>UV <strong>{model.current.uvIndex}</strong></div> : null}
              {model.current.cloudCoverage !== undefined ? <div>Clouds <strong>{model.current.cloudCoverage}%</strong></div> : null}
            </div>
          </section>
          <section className={`rounded-2xl p-4 ${panel}`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className={`text-sm font-medium ${muted}`}>Weather chart</div>
              <select
                value={metric}
                onChange={(event) => setMetric(event.target.value as WeatherChartMetric)}
                className={`rounded-lg px-2 py-1 text-xs ${light ? 'bg-white text-slate-700' : 'bg-white/10 text-white'}`}
                aria-label="Chart metric"
              >
                <option value="temperature">Temperature + precipitation</option>
                <option value="apparentTemperature">Feels like</option>
                <option value="humidity">Humidity</option>
                <option value="pressure">Pressure</option>
                <option value="uvIndex">UV</option>
              </select>
            </div>
            <WeatherChart forecast={hourly.slice(0, 24)} metric={metric} theme={theme} />
          </section>
        </div>
        <section className={`mt-5 rounded-2xl p-4 ${panel}`}>
          <div className={`mb-3 text-sm font-medium ${muted}`}>Daily forecast</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
            {daily.slice(0, 7).map((point) => (
              <div key={point.datetime} className={`rounded-xl p-3 text-center text-sm ${light ? 'bg-white' : 'bg-white/5'}`}>
                <div className={muted}>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(point.datetime))}</div>
                <WeatherIcon condition={point.condition ?? 'cloudy'} isNight={point.isDaytime === false} className="mx-auto my-2 h-8 w-8" />
                <div>{point.temperature !== undefined ? `${point.temperature}${temperatureSuffix}` : '—'}</div>
                {point.temperatureLow !== undefined ? <div className={muted}>{point.temperatureLow}{temperatureSuffix}</div> : null}
                {point.precipitationProbability !== undefined ? <div className="mt-1 text-xs text-sky-500">{point.precipitationProbability}%</div> : null}
              </div>
            ))}
          </div>
        </section>
        {model.current.sunrise || model.current.sunset ? (
          <div className={`mt-4 text-sm ${muted}`}>Sunrise {model.current.sunrise ?? '—'} · Sunset {model.current.sunset ?? '—'}</div>
        ) : null}
      </div>
    </div>
  );
}
