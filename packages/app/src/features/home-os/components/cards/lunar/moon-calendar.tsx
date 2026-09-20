import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { calculatePhase } from './lunar-engine';
import { getUpstreamMoonImageUrl } from './moon-assets';
import { buildMoonCardModelForDate, getMoonPhaseName, type MoonCardModel } from './moon-card-model';
import { MoonDataSwiper } from './moon-data-swiper';

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + days);
  return date;
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function MoonDayImage({ date, className }: { date: Date; className: string }) {
  const phase = calculatePhase(date);
  const image = getUpstreamMoonImageUrl(phase.phase);
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`${className} object-contain grayscale`}
      src={image.url}
    />
  );
}

export function CompactMoonCalendar({
  selectedDate,
  model,
  language,
  onSelect,
  onOpenFull,
}: {
  selectedDate: Date;
  model: MoonCardModel;
  language: string;
  onSelect: (date: Date) => void;
  onOpenFull: () => void;
}) {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const [detailsOpen, setDetailsOpen] = useState(false);
  const phase = calculatePhase(selectedDate);
  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-card-interactive
      data-lunar-calendar="compact"
    >
      <div className="flex min-h-0 flex-1 items-center gap-4 px-3 py-2">
        <MoonDayImage date={selectedDate} className="h-28 w-28 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-sm font-medium">
            {selectedDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
          </div>
          <div className="text-xs text-current/65">
            {language === 'zh' ? '照明' : 'Illumination'} {Math.round(phase.illumination * 100)}%
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[0.68rem]">
            <span>
              <span className="block text-current/45">{language === 'zh' ? '月龄' : 'Age'}</span>
              <span className="tabular-nums">{model.ageDays.toFixed(1)}</span>
            </span>
            <span>
              <span className="block text-current/45">{language === 'zh' ? '月出' : 'Rise'}</span>
              <span>
                {model.moonrise?.toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                }) ?? '—'}
              </span>
            </span>
            <span>
              <span className="block text-current/45">{language === 'zh' ? '月落' : 'Set'}</span>
              <span>
                {model.moonset?.toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                }) ?? '—'}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div
        className="flex h-9 items-center justify-between bg-black/14 px-1 text-current/70"
        data-lunar-calendar-footer
      >
        <div className="flex items-center">
          <button
            type="button"
            aria-label={language === 'zh' ? '完整月历' : 'Full calendar'}
            className="rounded p-1"
            onClick={onOpenFull}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={language === 'zh' ? '返回今天' : 'Restore today'}
            className="rounded p-1"
            onClick={() => onSelect(new Date())}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={language === 'zh' ? '前一天' : 'Previous day'}
            className="rounded p-1"
            onClick={() => onSelect(addDays(selectedDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs">
          {selectedDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
        </span>
        <div className="flex items-center">
          <button
            type="button"
            aria-label={language === 'zh' ? '后一天' : 'Next day'}
            aria-pressed={false}
            className="rounded p-1"
            onClick={() => onSelect(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={language === 'zh' ? '切换详情' : 'Toggle details'}
            aria-expanded={detailsOpen}
            className="rounded p-1"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? '⌃' : '⌄'}
          </button>
        </div>
      </div>
      <div
        className={`overflow-hidden px-3 transition-[max-height,opacity] duration-500 ${detailsOpen ? 'max-h-64 py-2 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <MoonDataSwiper model={model} language={language} />
      </div>
    </div>
  );
}

export function FullMoonCalendar({
  selectedDate,
  model,
  language,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  model: MoonCardModel;
  language: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12)
  );
  const [tooltipDate, setTooltipDate] = useState<Date | null>(null);
  const tooltipModel = useMemo(
    () => (tooltipDate ? buildMoonCardModelForDate(model, tooltipDate) : undefined),
    [model, tooltipDate]
  );
  useEffect(() => {
    setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
  }, [selectedDate]);
  const cells = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    return {
      filler: Array.from({ length: mondayOffset }, (_, index) => `filler-${index}`),
      days: Array.from({ length: daysInMonth }, (_, index) => addDays(first, index)),
    };
  }, [viewDate]);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    addDays(new Date(2026, 0, 5, 12), index).toLocaleDateString(locale, { weekday: 'narrow' })
  );
  const moveMonth = (offset: number) =>
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-card-interactive
      data-lunar-calendar="full"
      data-calendar-view={`${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`}
    >
      <div className="flex h-8 shrink-0 items-center gap-1 text-xs">
        <button
          type="button"
          aria-label={language === 'zh' ? '关闭完整月历' : 'Close full calendar'}
          className="rounded-full p-1 hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={language === 'zh' ? '返回本月' : 'Return to this month'}
          className="rounded-full p-1 hover:bg-white/10"
          onClick={() =>
            setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12))
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            aria-label={language === 'zh' ? '上一年' : 'Previous year'}
            className="rounded-full p-1 hover:bg-white/10"
            onClick={() =>
              setViewDate(
                (current) => new Date(current.getFullYear() - 1, current.getMonth(), 1, 12)
              )
            }
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-24 text-center font-medium capitalize">
            {viewDate.toLocaleDateString(locale, { year: 'numeric' })}
          </span>
          <button
            type="button"
            aria-label={language === 'zh' ? '下一年' : 'Next year'}
            className="rounded-full p-1 hover:bg-white/10"
            onClick={() =>
              setViewDate(
                (current) => new Date(current.getFullYear() + 1, current.getMonth(), 1, 12)
              )
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          aria-label={language === 'zh' ? '上个月' : 'Previous month'}
          className="rounded-full p-1 hover:bg-white/10"
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-20 text-center capitalize">
          {viewDate.toLocaleDateString(locale, { month: 'long' })}
        </span>
        <button
          type="button"
          aria-label={language === 'zh' ? '下个月' : 'Next month'}
          className="rounded-full p-1 hover:bg-white/10"
          onClick={() => moveMonth(1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr gap-px">
        {weekdays.map((day, index) => (
          <span
            className="text-center text-[0.55rem] uppercase text-current/40"
            key={`${day}-${index}`}
          >
            {day}
          </span>
        ))}
        {cells.filler.map((key) => (
          <span key={key} />
        ))}
        {cells.days.map((date) => {
          const selected = sameDay(date, selectedDate);
          const phase = calculatePhase(date);
          const emoji = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][
            Math.round((((phase.phase % 1) + 1) % 1) * 8) % 8
          ];
          const today = sameDay(date, new Date());
          return (
            <button
              type="button"
              key={date.toISOString()}
              aria-label={date.toLocaleDateString(locale)}
              aria-pressed={selected}
              className={`relative flex min-h-0 flex-col items-center justify-center rounded-[4px] border transition-colors ${
                selected
                  ? 'border-current/20 bg-current/[0.12]'
                  : today
                    ? 'border-[var(--accent-color)]'
                    : 'border-transparent hover:border-[var(--accent-color)] hover:bg-current/[0.04]'
              }`}
              onClick={() => {
                onSelect(date);
                setTooltipDate(date);
              }}
            >
              <span className="absolute right-0.5 top-0 text-[0.48rem] tabular-nums text-current/55">
                {date.getDate()}
              </span>
              <span className="text-[clamp(1rem,3vw,2rem)] leading-none">{emoji}</span>
            </button>
          );
        })}
      </div>
      {tooltipDate ? (
        <div
          className="absolute inset-x-3 bottom-3 z-20 rounded-lg border border-current/10 bg-black/80 p-3 text-center shadow-lg backdrop-blur-[10px]"
          data-lunar-calendar-tooltip
        >
          <button
            type="button"
            className="absolute right-2 top-1 text-current/60"
            aria-label={language === 'zh' ? '关闭提示' : 'Close tooltip'}
            onClick={() => setTooltipDate(null)}
          >
            ×
          </button>
          <div className="text-xs text-current/60">
            {tooltipDate.toLocaleDateString(locale, { dateStyle: 'medium' })}
          </div>
          <div className="font-medium">
            {getMoonPhaseName(getPhaseKey(calculatePhase(tooltipDate).phase), language)}
          </div>
          <MoonDayImage date={tooltipDate} className="mx-auto my-2 h-20 w-20" />
          {tooltipModel ? <MoonDataSwiper model={tooltipModel} language={language} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function getPhaseKey(phase: number) {
  const normalized = ((phase % 1) + 1) % 1;
  const keys = [
    'new_moon',
    'waxing_crescent',
    'first_quarter',
    'waxing_gibbous',
    'full_moon',
    'waning_gibbous',
    'last_quarter',
    'waning_crescent',
  ] as const;
  return keys[Math.round(normalized * 8) % 8] ?? 'new_moon';
}
