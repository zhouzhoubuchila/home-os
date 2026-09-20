import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, BarController, BarElement, Tooltip } from 'chart.js';
import { useEffect, useRef } from 'react';
import type { WeatherForecastPoint } from '@navet/app/features/weather/model/weather-model';
import type { ThemeType } from '@navet/app/hooks';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, BarController, BarElement, Tooltip);

export type WeatherChartMetric = 'temperature' | 'apparentTemperature' | 'humidity' | 'pressure' | 'uvIndex';

export function WeatherChart({
  forecast,
  metric = 'temperature',
  theme = 'dark',
}: {
  forecast: WeatherForecastPoint[];
  metric?: WeatherChartMetric;
  theme?: ThemeType;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || forecast.length === 0) return undefined;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, {
      data: {
        labels: forecast.map((point) => new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(point.datetime))),
        datasets: [
          {
            type: 'line',
            label: metric === 'temperature' ? 'Temperature' : metric,
            data: forecast.map((point) => point[metric] ?? null),
            borderColor: theme === 'light' ? '#b45309' : '#fbbf24',
            backgroundColor: theme === 'light' ? '#b45309' : '#fbbf24',
            tension: 0.35,
            spanGaps: true,
          },
          ...(metric === 'temperature' ? [{
            type: 'bar' as const,
            label: 'Precipitation',
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
        plugins: { legend: { display: false } },
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
  }, [forecast, metric, theme]);

  if (forecast.length === 0) return null;
  return <div className="h-28 min-h-0 w-full"><canvas ref={canvasRef} /></div>;
}
