import { Chart, type Plugin, type ScriptableLineSegmentContext } from 'chart.js/auto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHorizonSeries, getMoonEvents, type LunarLocation } from './lunar-engine';

function nearestIndex(times: number[], value: number) {
  let best = 0;
  for (let index = 1; index < times.length; index += 1) {
    if (Math.abs(times[index] - value) < Math.abs(times[best] - value)) best = index;
  }
  return best;
}

function markerPlugin(
  date: Date,
  times: number[],
  events: { rise?: Date; set?: Date },
  language: string
): Plugin<'line'> {
  const drawMarker = (
    chart: Chart<'line'>,
    value: number,
    _label: string,
    color: string,
    row = 0
  ) => {
    if (value < times[0] || value > times[times.length - 1]) return;
    const index = nearestIndex(times, value);
    const x = chart.scales.x.getPixelForValue(index);
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top + 4);
    ctx.lineTo(x, chartArea.bottom - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(x, chartArea.bottom - 8, row === 0 ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  return {
    id: 'lunarMarkers',
    afterDatasetsDraw(chart) {
      const locale = language === 'zh' ? 'zh-CN' : 'en-US';
      const time = (value: Date) =>
        value.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      drawMarker(
        chart,
        date.getTime(),
        language === 'zh' ? `现在 ${time(date)}` : `Now ${time(date)}`,
        '#94a3b8',
        0
      );
      if (events.rise)
        drawMarker(
          chart,
          events.rise.getTime(),
          `${language === 'zh' ? '月出' : 'Rise'} ${time(events.rise)}`,
          '#dbeafe',
          1
        );
      if (events.set)
        drawMarker(
          chart,
          events.set.getTime(),
          `${language === 'zh' ? '月落' : 'Set'} ${time(events.set)}`,
          '#cbd5e1',
          1
        );
      const midnight = new Date(date);
      midnight.setHours(24, 0, 0, 0);
      drawMarker(chart, midnight.getTime(), language === 'zh' ? '午夜' : 'Midnight', '#64748b', 2);
    },
  };
}

export default function MoonHorizonChart({
  date,
  location,
  language,
}: {
  date: Date;
  location?: LunarLocation;
  language: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'line'> | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported'>('loading');
  const series = useMemo(
    () => (location ? buildHorizonSeries(date, location) : []),
    [date, location]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !location || series.length === 0) {
      setStatus('unsupported');
      return;
    }
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext('2d');
    } catch {
      setStatus('unsupported');
      return;
    }
    if (!context) {
      setStatus('unsupported');
      return;
    }
    const times = series.map((point) => point.time.getTime());
    const events = getMoonEvents(date, location);
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    const chart = new Chart(context, {
      type: 'line',
      data: {
        labels: series.map((point) =>
          point.time.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        ),
        datasets: [
          {
            label: language === 'zh' ? '月球高度' : 'Moon altitude',
            data: series.map((point) => point.altitude),
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderWidth: 2,
            cubicInterpolationMode: 'monotone',
            tension: 0.2,
            borderWidth: 1.2,
            fill: {
              target: { value: 0 },
              above: 'rgba(148,163,184,0.18)',
              below: 'rgba(15,23,42,0.16)',
            },
            segment: {
              borderColor: (segment: ScriptableLineSegmentContext) =>
                (segment.p0.parsed.y ?? -1) >= 0 && (segment.p1.parsed.y ?? -1) >= 0
                  ? 'rgba(248,250,252,0.9)'
                  : 'rgba(100,116,139,0.55)',
              borderWidth: (segment: ScriptableLineSegmentContext) =>
                (segment.p0.parsed.y ?? -1) >= 0 && (segment.p1.parsed.y ?? -1) >= 0 ? 1.4 : 1,
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260,
        },
        interaction: { intersect: false, mode: 'index', axis: 'x' },
        events: ['mousemove', 'mouseout', 'touchstart', 'touchmove', 'click'],
        layout: { padding: { left: -6, right: -6, top: 4, bottom: 1 } },
        scales: {
          x: { display: false, grid: { display: false }, border: { display: false } },
          y: {
            grid: {
              color: (context) =>
                context.tick.value === 0 ? 'rgba(148,163,184,0.52)' : 'transparent',
              lineWidth: (context) => (context.tick.value === 0 ? 1 : 0),
            },
            border: { display: false },
            ticks: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title(items) {
                const point = series[items[0]?.dataIndex ?? 0];
                return point.time.toLocaleString(locale, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              },
              label(item) {
                const point = series[item.dataIndex];
                return [
                  `${language === 'zh' ? '高度' : 'Altitude'}: ${point.altitude.toFixed(1)}°`,
                  `${language === 'zh' ? '方位' : 'Azimuth'}: ${point.azimuth.toFixed(1)}°`,
                ];
              },
            },
          },
        },
      },
      plugins: [markerPlugin(date, times, events, language)],
    });
    chartRef.current = chart;
    setStatus('ready');
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [date, language, location, series]);

  if (!location) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-current/50">
        {language === 'zh' ? '需要家庭位置数据' : 'Home location is required'}
      </div>
    );
  }

  return (
    <div
      className="relative h-full min-h-[90px] w-full"
      data-card-interactive
      data-lunar-horizon
      data-chart-module="chart.js"
      data-chart-status={status}
      data-current-marker="true"
    >
      <canvas
        ref={canvasRef}
        aria-label={language === 'zh' ? '动态月轨图' : 'Dynamic moon horizon chart'}
        role="img"
      />
      {status === 'unsupported' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-current/45">
          {language === 'zh' ? '当前环境无法绘制月轨' : 'Chart unavailable in this environment'}
        </div>
      ) : null}
    </div>
  );
}
