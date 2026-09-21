import type { WeatherForecastPoint } from '@navet/app/features/weather/model/weather-model';
import type { ThemeType } from '@navet/app/hooks';
import { convertTemperatureUnitValue, type TemperatureUnit } from '@navet/app/utils/temperature';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from 'chart.js';
import { useEffect, useRef } from 'react';
import { LUNAR_WEATHER_CARD_TOKENS } from '@navet/app/components/shared/theme/lunar-weather-card-tokens';
import { formatWeatherTemperature } from './weather-temperature';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
);

export type WeatherChartMetric =
  | 'temperature'
  | 'apparentTemperature'
  | 'humidity'
  | 'pressure'
  | 'uvIndex';
export type WeatherChartMode = 'hourly' | 'daily';

export function getWeatherChartAvailability(forecast: WeatherForecastPoint[]) {
  return {
    temperature: forecast.some((point) => typeof point.temperature === 'number'),
    lowTemperature: forecast.some((point) => typeof point.temperatureLow === 'number'),
    precipitation: forecast.some(
      (point) => typeof point.precipitationAmount === 'number' && point.precipitationAmount > 0
    ),
    apparentTemperature: forecast.some((point) => typeof point.apparentTemperature === 'number'),
    humidity: forecast.some((point) => typeof point.humidity === 'number'),
    pressure: forecast.some((point) => typeof point.pressure === 'number'),
    uvIndex: forecast.some((point) => typeof point.uvIndex === 'number'),
  };
}

interface WeatherChartProps {
  forecast: WeatherForecastPoint[];
  metric?: WeatherChartMetric;
  mode?: WeatherChartMode;
  theme?: ThemeType;
  locale?: string;
  use24HourTime?: boolean;
  sourceTemperatureUnit?: TemperatureUnit;
  displayTemperatureUnit?: TemperatureUnit;
  metricLabels?: Partial<Record<WeatherChartMetric | 'precipitation' | 'high' | 'low', string>>;
}

function formatChartMetricValue(
  point: WeatherForecastPoint,
  metric: WeatherChartMetric,
  value: number,
  sourceTemperatureUnit: TemperatureUnit | undefined,
  displayTemperatureUnit: TemperatureUnit
) {
  if (metric === 'temperature' || metric === 'apparentTemperature') {
    return formatWeatherTemperature(
      value,
      point.temperatureUnit ?? sourceTemperatureUnit,
      displayTemperatureUnit
    );
  }
  if (metric === 'humidity') return `${Math.round(value)}%`;
  if (metric === 'pressure') return `${Math.round(value * 10) / 10} hPa`;
  if (metric === 'uvIndex') return `${Math.round(value * 10) / 10}`;
  return String(value);
}

function getTimeLabel(
  point: WeatherForecastPoint,
  mode: WeatherChartMode,
  locale: string | undefined,
  use24HourTime: boolean
) {
  const date = new Date(point.datetime);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    ...(mode === 'hourly' ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short' }),
    hour12: mode === 'hourly' ? !use24HourTime : undefined,
  }).format(date);
}

export function WeatherChart({
  forecast,
  metric = 'temperature',
  mode = 'hourly',
  theme = 'dark',
  locale,
  use24HourTime = false,
  sourceTemperatureUnit,
  displayTemperatureUnit,
  metricLabels,
}: WeatherChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const displayUnit = displayTemperatureUnit ?? sourceTemperatureUnit ?? 'celsius';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || forecast.length === 0) return undefined;
    chartRef.current?.destroy();

    const isTemperature = metric === 'temperature';
    const availability = getWeatherChartAvailability(forecast);
    const hasLow = isTemperature && availability.lowTemperature;
    const hasPrecipitation = isTemperature && availability.precipitation;
    const isUv = metric === 'uvIndex';
    const primaryValues = forecast.map((point) => {
      const value = point[metric];
      if (typeof value !== 'number') return null;
      if (metric !== 'temperature' && metric !== 'apparentTemperature') return value;
      return convertTemperatureUnitValue(
        value,
        point.temperatureUnit ?? sourceTemperatureUnit,
        displayUnit
      );
    });
    const lowValues = forecast.map((point) => {
      if (typeof point.temperatureLow !== 'number') return null;
      return convertTemperatureUnitValue(
        point.temperatureLow,
        point.temperatureUnit ?? sourceTemperatureUnit,
        displayUnit
      );
    });
    const lineColor = theme === 'light' ? '#2563eb' : '#7dd3fc';
    const lowColor = theme === 'light' ? '#6366f1' : '#a5b4fc';
    const precipitationColor = theme === 'light' ? 'rgba(14,116,204,0.34)' : 'rgba(56,189,248,0.42)';
    const labels = forecast.map((point) => getTimeLabel(point, mode, locale, use24HourTime));
    const datasets = isUv
      ? [
          {
            type: 'bar' as const,
            label: metricLabels?.uvIndex ?? 'UV',
            data: primaryValues,
            backgroundColor: precipitationColor,
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.75,
          },
        ]
      : [
          {
            type: 'line' as const,
            label:
              isTemperature && mode === 'daily'
                ? metricLabels?.high ?? 'High'
                : metricLabels?.[metric] ?? metric,
            data: primaryValues,
            borderColor: lineColor,
            backgroundColor: lineColor,
            borderWidth: 2.2,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointHitRadius: 10,
            tension: 0.32,
            spanGaps: true,
            fill: false,
          },
          ...(hasLow
            ? [
                {
                  type: 'line' as const,
                  label: metricLabels?.low ?? 'Low',
                  data: lowValues,
                  borderColor: lowColor,
                  backgroundColor: lowColor,
                  borderWidth: 2,
                  pointRadius: 2,
                  pointHoverRadius: 4.5,
                  pointHitRadius: 10,
                  tension: 0.32,
                  spanGaps: true,
                  fill: false,
                },
              ]
            : []),
          ...(hasPrecipitation
            ? [
                {
                  type: 'bar' as const,
                  label: metricLabels?.precipitation ?? 'Precipitation',
                  data: forecast.map((point) => point.precipitationAmount ?? null),
                  backgroundColor: precipitationColor,
                  borderRadius: 4,
                  barPercentage: 0.55,
                  categoryPercentage: 0.7,
                  yAxisID: 'precipitation',
                },
              ]
            : []),
        ];

    const valueLabelsPlugin: Plugin = {
      id: 'weather-value-labels',
      afterDatasetsDraw(chart) {
        const context = chart.ctx;
        context.save();
        context.font = '600 10px ui-sans-serif, system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        const labelStep = mode === 'daily' ? 1 : Math.max(1, Math.ceil(forecast.length / 8));
        const lineDatasetCount = isTemperature ? (hasLow ? 2 : 1) : isUv ? 0 : 1;
        for (let datasetIndex = 0; datasetIndex < lineDatasetCount; datasetIndex += 1) {
          const metadata = chart.getDatasetMeta(datasetIndex);
          const values = datasetIndex === 1 ? lowValues : primaryValues;
          const color = datasetIndex === 1 ? lowColor : lineColor;
          context.fillStyle = color;
          metadata.data.forEach((element, index) => {
            if (index % labelStep !== 0 || typeof values[index] !== 'number') return;
            const point = forecast[index];
            const originalValue = datasetIndex === 1 ? point.temperatureLow : point[metric];
            if (typeof originalValue !== 'number') return;
            const label = formatChartMetricValue(
              point,
              metric,
              originalValue,
              sourceTemperatureUnit,
              displayUnit
            );
            const position = element.getProps(['x', 'y'], true);
            context.fillText(label, position.x, position.y - 7);
          });
        }
        context.restore();
      },
    };

    const numericValues = primaryValues.filter((value): value is number => typeof value === 'number');
    const pressurePadding = metric === 'pressure' && numericValues.length > 0
      ? Math.max(1, (Math.max(...numericValues) - Math.min(...numericValues)) * 0.18)
      : undefined;

    chartRef.current = new Chart(canvas, {
      data: { labels, datasets },
      plugins: [valueLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(8,15,30,0.94)',
            borderColor: theme === 'light' ? 'rgba(125,211,252,0.55)' : 'rgba(255,255,255,0.14)',
            borderWidth: 1,
            titleColor: theme === 'light' ? '#0f172a' : 'rgba(255,255,255,0.92)',
            bodyColor: theme === 'light' ? '#334155' : 'rgba(255,255,255,0.78)',
            padding: 10,
            cornerRadius: 12,
            callbacks: {
              title: (items) => items[0]?.label ?? '',
              label: (context) => {
                const point = forecast[context.dataIndex];
                if (!point || typeof context.raw !== 'number') return '';
                if (context.dataset.type === 'bar' && context.datasetIndex === datasets.length - 1 && hasPrecipitation) {
                  return `${metricLabels?.precipitation ?? 'Precipitation'}: ${context.raw}${point.precipitationUnit ? ` ${point.precipitationUnit}` : ''}`;
                }
                if (isUv && context.dataset.type === 'bar') {
                  return `${metricLabels?.uvIndex ?? 'UV'}: ${context.raw}`;
                }
                const originalValue = context.datasetIndex === 1 ? point.temperatureLow : point[metric];
                if (typeof originalValue !== 'number') return '';
                return `${context.dataset.label ?? metric}: ${formatChartMetricValue(point, metric, originalValue, sourceTemperatureUnit, displayUnit)}`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            ticks: {
              color: theme === 'light' ? '#64748b' : 'rgba(255,255,255,0.62)',
              maxTicksLimit: mode === 'hourly' ? 8 : 7,
              autoSkip: true,
              maxRotation: 0,
            },
          },
          y: {
            display: false,
            beginAtZero: metric === 'humidity' || isUv,
            min: pressurePadding !== undefined ? Math.min(...numericValues) - pressurePadding : undefined,
            max: pressurePadding !== undefined ? Math.max(...numericValues) + pressurePadding : undefined,
          },
          precipitation: {
            display: false,
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
          },
        },
      },
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [displayTemperatureUnit, displayUnit, forecast, locale, metric, metricLabels, mode, sourceTemperatureUnit, theme, use24HourTime]);

  if (forecast.length === 0) return null;
  return (
    <div className={LUNAR_WEATHER_CARD_TOKENS.chart}>
      <canvas ref={canvasRef} />
    </div>
  );
}
