import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { CalendarDays, ChartNoAxesCombined, Moon } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { UPSTREAM_LUNAR_PHASE_CARD_COMMIT } from './moon-assets';
import { CompactMoonCalendar, FullMoonCalendar } from './moon-calendar';
import { buildMoonCardModelForDate, getMoonPhaseName, type MoonCardModel } from './moon-card-model';
import { MoonDataSwiper } from './moon-data-swiper';

const LazyMoonHorizonChart = lazy(() => import('./moon-horizon-chart'));
const LazyLunarStarfield = lazy(() => import('./lunar-starfield'));

export type LunarSection = 'base' | 'calendar' | 'horizon' | 'full_calendar';
export type LunarCardMode = 'dashboard' | 'expanded';

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function sourceLabel(source: MoonCardModel['source'], language: string) {
  if (source === 'entity') return language === 'zh' ? '实体数据' : 'Entity data';
  return 'SunCalc3';
}

export function MoonPhaseVisual({
  model,
  language,
  className = '',
}: {
  model: MoonCardModel;
  language: string;
  className?: string;
}) {
  const name = getMoonPhaseName(model.phaseKey, language);
  return (
    <div
      role="img"
      aria-label={
        language === 'zh'
          ? `${name}，照明 ${model.illuminationPercent}%`
          : `${name}, ${model.illuminationPercent}% illuminated`
      }
      className={`relative aspect-square shrink-0 select-none ${className}`}
      data-moon-phase={model.phaseKey}
      data-moon-direction={model.phase < 0.5 ? 'waxing' : 'waning'}
      data-upstream-moon-image="true"
      data-upstream-phase-index={model.phaseImageIndex}
      data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
    >
      <img
        src={model.moonImageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full object-contain grayscale brightness-95 drop-shadow-[2px_2px_6px_rgb(255_255_255/0.2)] transition-opacity duration-500 motion-reduce:transition-none"
      />
    </div>
  );
}

function SectionControl({
  section,
  active,
  disabled,
  language,
  onSelect,
}: {
  section: Exclude<LunarSection, 'full_calendar'>;
  active: boolean;
  disabled: boolean;
  language: string;
  onSelect: (section: LunarSection) => void;
}) {
  const config = {
    base: { icon: Moon, zh: '月相', en: 'Phase' },
    horizon: { icon: ChartNoAxesCombined, zh: '月轨', en: 'Horizon' },
    calendar: { icon: CalendarDays, zh: '月历', en: 'Calendar' },
  }[section];
  const Icon = config.icon;
  const label = language === 'zh' ? config.zh : config.en;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`flex h-6 items-center gap-1 rounded-full px-2 text-[0.62rem] transition-colors disabled:opacity-50 ${
        active
          ? 'bg-white/14 text-current'
          : 'text-current/50 hover:bg-white/8 hover:text-current/80'
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(section);
      }}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </button>
  );
}

function PhaseBase({
  model,
  language,
  large,
}: {
  model: MoonCardModel;
  language: string;
  large: boolean;
}) {
  const phaseName = getMoonPhaseName(model.phaseKey, language);
  return (
    <div className="flex h-full min-h-0 items-center gap-3" data-lunar-section-content="base">
      <div className="flex w-[36%] min-w-[88px] max-w-[152px] flex-col items-center justify-center">
        <MoonPhaseVisual
          model={model}
          language={language}
          className={large ? 'h-32 w-32' : 'h-[5.4rem] w-[5.4rem]'}
        />
        <p className="mt-0.5 max-w-full truncate text-center text-sm font-semibold tracking-tight">
          {phaseName}
        </p>
        <p className="text-[0.62rem] text-current/48 tabular-nums">
          {model.illuminationPercent}% · {sourceLabel(model.source, language)}
        </p>
      </div>
      <div className="h-full min-w-0 flex-1">
        <MoonDataSwiper model={model} language={language} />
      </div>
    </div>
  );
}

export interface InteractiveLunarCardProps {
  size: CardSize;
  model: MoonCardModel;
  language: string;
  theme?: ThemeType;
  mode?: LunarCardMode;
  initialSection?: LunarSection;
}

/** React port preserving upstream's section, Swiper, chart, calendar and particles architecture. */
export function InteractiveLunarCard({
  size,
  model,
  language,
  theme,
  mode = 'dashboard',
  initialSection = 'base',
}: InteractiveLunarCardProps) {
  const { theme: activeTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const small =
    mode === 'dashboard' && (size === 'small' || size === 'tiny' || size === 'extra-small');
  const large =
    mode === 'expanded' || size === 'large' || size === 'extra-large' || size === 'extra-wide';
  const [activeSection, setActiveSection] = useState<LunarSection>(small ? 'base' : initialSection);
  const [changing, setChanging] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date(model.date));
  const [hasInteracted, setHasInteracted] = useState(false);
  const selectedModel = useMemo(
    () =>
      sameDay(selectedDate, model.date) ? model : buildMoonCardModelForDate(model, selectedDate),
    [model, selectedDate]
  );
  const changeSection = (section: LunarSection) => {
    if (section === activeSection) return;
    setHasInteracted(true);
    setChanging(true);
    setActiveSection(section);
  };
  useEffect(() => {
    if (!changing) return;
    const timer = window.setTimeout(() => setChanging(false), reducedMotion ? 0 : 500);
    return () => window.clearTimeout(timer);
  }, [changing, reducedMotion]);

  const content = small ? (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center gap-1 p-3"
      data-lunar-section-content="base"
    >
      <MoonPhaseVisual model={selectedModel} language={language} className="h-16 w-16" />
      <p className="max-w-full truncate text-sm font-semibold">
        {getMoonPhaseName(selectedModel.phaseKey, language)}
      </p>
      <p className="text-xs text-current/55 tabular-nums">
        {language === 'zh' ? '照明' : 'Illumination'} {selectedModel.illuminationPercent}%
      </p>
    </div>
  ) : activeSection === 'base' ? (
    <PhaseBase model={selectedModel} language={language} large={large} />
  ) : activeSection === 'horizon' ? (
    <Suspense
      fallback={
        <div
          className="flex h-full items-center justify-center text-xs text-current/45"
          data-chart-lazy-loading
        >
          {language === 'zh' ? '正在载入动态月轨…' : 'Loading dynamic horizon…'}
        </div>
      }
    >
      <LazyMoonHorizonChart date={selectedDate} location={model.location} language={language} />
    </Suspense>
  ) : activeSection === 'full_calendar' ? (
    <FullMoonCalendar
      selectedDate={selectedDate}
      language={language}
      onSelect={setSelectedDate}
      onClose={() => changeSection('calendar')}
    />
  ) : large ? (
    <FullMoonCalendar
      selectedDate={selectedDate}
      language={language}
      onSelect={setSelectedDate}
      onClose={() => changeSection('base')}
    />
  ) : (
    <CompactMoonCalendar
      selectedDate={selectedDate}
      model={selectedModel}
      language={language}
      onSelect={setSelectedDate}
      onOpenFull={() => changeSection('full_calendar')}
    />
  );

  return (
    <BaseCard
      size={size}
      fullBleed
      themeOverride={theme}
      frameClassName={`overflow-hidden ${
        mode === 'expanded' ? 'h-[min(28rem,62vh)] min-h-[22rem]' : ''
      }`}
      contentClassName="h-full"
      disableDefaultSheen
      underlay={
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_34%,rgba(148,163,184,0.10),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.12),transparent)]" />
      }
    >
      <div
        className="relative flex h-full min-h-0 flex-col"
        data-home-os-moon-card="interactive-upstream-port"
        data-lunar-mode={mode}
        data-lunar-size={size}
        data-lunar-active-section={activeSection}
        data-moon-source={selectedModel.source}
        data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
        data-theme={theme ?? activeTheme}
      >
        {hasInteracted && !small ? (
          <Suspense fallback={null}>
            <LazyLunarStarfield density={large ? 'large' : 'medium'} />
          </Suspense>
        ) : null}
        {!small && activeSection !== 'full_calendar' ? (
          <header
            className="relative z-10 flex h-9 shrink-0 items-center gap-2 px-3"
            data-card-interactive
          >
            <span className="mr-auto truncate text-xs font-semibold">
              {getMoonPhaseName(selectedModel.phaseKey, language)}
            </span>
            <nav
              className="flex items-center rounded-full border border-current/10 bg-black/5 p-0.5"
              aria-label={language === 'zh' ? '月相卡片视图' : 'Lunar card sections'}
            >
              <SectionControl
                section="base"
                active={activeSection === 'base'}
                disabled={changing}
                language={language}
                onSelect={changeSection}
              />
              <SectionControl
                section="horizon"
                active={activeSection === 'horizon'}
                disabled={changing}
                language={language}
                onSelect={changeSection}
              />
              <SectionControl
                section="calendar"
                active={activeSection === 'calendar'}
                disabled={changing}
                language={language}
                onSelect={changeSection}
              />
            </nav>
          </header>
        ) : null}
        <div
          className={`relative z-10 min-h-0 flex-1 overflow-hidden ${
            small ? '' : activeSection === 'full_calendar' ? 'p-1.5' : 'px-3 pb-2'
          } transition-all ${
            changing ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
          } ${reducedMotion ? 'duration-0' : 'duration-500'}`}
        >
          {content}
        </div>
      </div>
    </BaseCard>
  );
}

export function MoonCard(props: Omit<InteractiveLunarCardProps, 'mode'>) {
  return <InteractiveLunarCard {...props} mode="dashboard" />;
}

export function MoonCardDetail({ model, language }: { model: MoonCardModel; language: string }) {
  return <InteractiveLunarCard size="large" model={model} language={language} mode="expanded" />;
}
