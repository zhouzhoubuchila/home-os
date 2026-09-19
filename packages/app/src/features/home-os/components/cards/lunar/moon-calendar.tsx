import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { calculatePhase } from './lunar-engine';
import { getUpstreamMoonImageUrl } from './moon-assets';
import type { MoonCardModel } from './moon-card-model';

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
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 3)),
    [selectedDate]
  );
  return (
    <div
      className="flex h-full min-h-0 flex-col justify-between"
      data-card-interactive
      data-lunar-calendar="compact"
    >
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const selected = sameDay(date, selectedDate);
          return (
            <button
              type="button"
              key={date.toISOString()}
              aria-pressed={selected}
              aria-label={date.toLocaleDateString(locale)}
              className={`flex min-w-0 flex-col items-center rounded-lg px-0.5 py-1 transition-colors ${
                selected ? 'bg-white/14 ring-1 ring-current/25' : 'hover:bg-white/8'
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(date);
              }}
            >
              <span className="text-[0.58rem] uppercase text-current/45">
                {date.toLocaleDateString(locale, { weekday: 'narrow' })}
              </span>
              <MoonDayImage date={date} className="my-0.5 h-6 w-6" />
              <span className="text-[0.62rem] tabular-nums">{date.getDate()}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-current/10 pt-1.5 text-[0.68rem]">
        <span className="truncate text-current/60">
          {selectedDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' })} ·{' '}
          {model.illuminationPercent}%
        </span>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-full border border-current/15 px-2 py-1 hover:bg-white/10"
          onClick={(event) => {
            event.stopPropagation();
            onOpenFull();
          }}
        >
          <Maximize2 className="h-3 w-3" />
          {language === 'zh' ? '完整月历' : 'Full calendar'}
        </button>
      </div>
    </div>
  );
}

export function FullMoonCalendar({
  selectedDate,
  language,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  language: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12)
  );
  useEffect(() => {
    setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
  }, [selectedDate]);
  const cells = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => addDays(first, index - mondayOffset));
  }, [viewDate]);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    addDays(new Date(2026, 0, 5, 12), index).toLocaleDateString(locale, { weekday: 'narrow' })
  );
  const moveMonth = (offset: number) =>
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));

  return (
    <div
      className="flex h-full min-h-0 flex-col"
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
        <span className="ml-auto font-medium capitalize">
          {viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          aria-label={language === 'zh' ? '上个月' : 'Previous month'}
          className="rounded-full p-1 hover:bg-white/10"
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={language === 'zh' ? '下个月' : 'Next month'}
          className="rounded-full p-1 hover:bg-white/10"
          onClick={() => moveMonth(1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px">
        {weekdays.map((day, index) => (
          <span
            className="text-center text-[0.55rem] uppercase text-current/40"
            key={`${day}-${index}`}
          >
            {day}
          </span>
        ))}
        {cells.map((date) => {
          const selected = sameDay(date, selectedDate);
          const currentMonth = date.getMonth() === viewDate.getMonth();
          return (
            <button
              type="button"
              key={date.toISOString()}
              aria-label={date.toLocaleDateString(locale)}
              aria-pressed={selected}
              className={`relative flex min-h-0 flex-col items-center justify-center rounded-[4px] transition-colors ${
                selected
                  ? 'bg-white/16 ring-1 ring-inset ring-current/30'
                  : 'bg-black/10 hover:bg-white/8'
              } ${currentMonth ? '' : 'opacity-35'}`}
              onClick={() => onSelect(date)}
            >
              <span className="absolute right-0.5 top-0 text-[0.48rem] tabular-nums text-current/55">
                {date.getDate()}
              </span>
              <MoonDayImage
                date={date}
                className="h-[clamp(10px,2.6vh,24px)] w-[clamp(10px,2.6vh,24px)]"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
