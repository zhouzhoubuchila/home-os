import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, BarController, BarElement, Tooltip } from 'chart.js';
import { useEffect, useRef } from 'react';
import type { WeatherForecastPoint } from '@navet/app/features/weather/model/weather-model';
import type { ThemeType } from '@navet/app/hooks';
import { convertTemperatureUnitValue, type TemperatureUnit } from '@navet/app/utils/temperature';
import { formatWeatherTemperature } from './weather-temperature';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, BarController, BarElement, Tooltip);

export type WeatherChartMetric = 'temperature' | 'apparentTemperature' | 'humidity' | 'pressure' | 'uvIndex';

export function WeatherChart({
  forecast,
  metric = 'temperature',
  theme = 'dark',
  sourceTemperatureUnit,
  displayTemperatureUnit,
  metricLabels,
}: {
  forecast: WeatherForecastPoint[];
  metric?: WeatherChartMetric;
  theme?: ThemeType;
  sourceTemperatureUnit?: TemperatureUnit;
  displayTemperatureUnit?: TemperatureUnit;
  metricLabels?: Partial<Record<WeatherChartMetric | 'precipitation', string>>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || forecast.length === 0) return undefined;
    chartRef.current?.destroy();
    const displayUnit = displayTemperatureUnit ?? sourceTemperatureUnit ?? 'celsius';
    const formatMetricValue = (point: WeatherForecastPoint, value: number) => {
      if (metric === 'temperature' || metric === 'apparentTemperature') {
        return formatWeatherTemperature(
          value,
          point.temperatureUnit ?? sourceTemperatureUnit,
          displayUnit
        );
      }
      return String(value);
    };
    chartRef.current = new Chart(canvas, {
      data: {
        labels: forecast.map((point) => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(point.datetime))),
        datasets: [
          {
            type: 'line',
            label: metricLabels?.[metric] ?? metric,
            data: forecast.map((point) => {
              const value = point[metric];
              if (typeof value !== 'number') return null;
              if (metric !== 'temperature' && metric !== 'apparentTemperature') return value;
              return convertTemperatureUnitValue(
                value,
                point.temperatureUnit ?? sourceTemperatureUnit,
                displayUnit
              );
            }),
            borderColor: theme === 'light' ? '#b45309' : '#fbbf24',
            backgroundColor: theme === 'light' ? '#b45309' : '#fbbf24',
            tension: 0.35,
            spanGaps: true,
          },
          ...(metric === 'temperature' ? [{
            type: 'bar' as const,
            label: metricLabels?.precipitation ?? 'Precipitation',
            data: forecast.map((point) => point.precipitationAmount ?? 0),
            backgroundColor: theme === 'light' ? 'rgba(2,132,199,0.35)' : 'rgba(56,189,248,0.45)',
            borderRadius: 3,
          }] : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const point = forecast[context.dataIndex];
                const value = context.raw;
                if (!point || typeof value !== 'number') return '';
                if (context.datasetIndex === 1) {
                  return `${metricLabels?.precipitation ?? 'Precipitation'}: ${value}${point.precipitationUnit ? ` ${point.precipitationUnit}` : ''}`;
                }
                const originalValue = point[metric];
                return `${metricLabels?.[metric] ?? metric}: ${formatMetricValue(point, typeof originalValue === 'number' ? originalValue : value)}`;
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [displayTemperatureUnit, forecast, metric, metricLabels, sourceTemperatureUnit, theme]);

  if (forecast.length === 0) return null;
  return <div className="h-28 min-h-0 w-full"><canvas ref={canvasRef} /></div>;
}
