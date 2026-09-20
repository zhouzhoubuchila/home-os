import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { CalendarDays, ChartNoAxesCombined, Moon } from 'lucide-react';
import { type CSSProperties, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LunarBackground } from './lunar-background';
import type { LunarBackgroundVariant } from './lunar-background-assets';
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

export function MoonPhaseVisual({
  model,
  language,
  className = '',
  style,
}: {
  model: MoonCardModel;
  language: string;
  className?: string;
  style?: CSSProperties;
}) {
  const name = getMoonPhaseName(model.phaseKey, language);
  const [hovered, setHovered] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const lightFraction = model.illuminationPercent >= 60;
  return (
    <div
      role="img"
      aria-label={
        language === 'zh'
          ? `${name}，照明 ${model.illuminationPercent}%`
          : `${name}, ${model.illuminationPercent}% illuminated`
      }
      className={`relative aspect-square shrink-0 select-none ${hovered ? 'group' : ''} ${className}`}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - bounds.left) / bounds.width) * 100,
          y: ((event.clientY - bounds.top) / bounds.height) * 100,
        });
      }}
      data-moon-phase={model.phaseKey}
      data-moon-direction={model.phase < 0.5 ? 'waxing' : 'waning'}
      data-upstream-moon-image="true"
      data-upstream-phase-index={model.phaseImageIndex}
      data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
    >
      {hovered ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] rounded-full border border-white/10 bg-[radial-gradient(circle_at_var(--pointer-x)_var(--pointer-y),rgb(255_255_255/0.2),rgb(0_0_0/0.4)_60%)]"
          style={
            { '--pointer-x': `${pointer.x}%`, '--pointer-y': `${pointer.y}%` } as CSSProperties
          }
        />
      ) : null}
      <img
        src={model.moonImageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`pointer-events-none relative h-full w-full object-contain grayscale drop-shadow-[2px_2px_6px_rgb(255_255_255/0.2)] ${hovered && !lightFraction ? 'brightness-200' : 'brightness-100'}`}
        style={model.southernHemisphere ? { transform: 'scaleX(-1) scaleY(-1)' } : undefined}
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
      className={`flex h-9 w-9 items-center justify-center rounded-md text-[0.6rem] transition-[background-color,opacity] disabled:opacity-50 ${
        active
          ? 'bg-current/[0.07] text-current/78'
          : 'text-current/38 hover:bg-current/[0.04] hover:text-current/65'
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(section);
      }}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [moonSize, setMoonSize] = useState(150);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const width = root.offsetWidth;
      const availableHeight = width * 0.5 - root.offsetTop;
      setMoonSize(Math.max(0, Math.min(width / 3.2, availableHeight, 150)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="[container-type:inline-size] flex h-full min-h-0 items-center gap-4 sm:gap-6"
      data-lunar-section-content="base"
    >
      <div className="flex min-w-0 items-center justify-center" style={{ width: moonSize }}>
        <MoonPhaseVisual
          model={model}
          language={language}
          className="h-full w-full"
          style={{ maxWidth: moonSize, maxHeight: moonSize }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <MoonDataSwiper model={model} language={language} chunkedLimit={large ? 6 : 5} />
      </div>
    </div>
  );
}

export interface InteractiveLunarCardProps {
  size: CardSize;
  model: MoonCardModel;
  language: string;
  /** Home OS shell title; upstream's internal phase header stays in content. */
  title?: string;
  hideStarfield?: boolean;
  theme?: ThemeType;
  mode?: LunarCardMode;
  initialSection?: LunarSection;
  backgroundVariant?: LunarBackgroundVariant;
}

/** React port preserving upstream's section, Swiper, chart, calendar and particles architecture. */
export function InteractiveLunarCard({
  size,
  model,
  language,
  title,
  hideStarfield = false,
  theme,
  mode = 'dashboard',
  initialSection = 'base',
  backgroundVariant,
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
  const [compactDetails, setCompactDetails] = useState(false);
  const selectedModel = useMemo(
    () =>
      sameDay(selectedDate, model.date) ? model : buildMoonCardModelForDate(model, selectedDate),
    [model, selectedDate]
  );
  // Upstream defaults every section to BLUE_BG (moon_bg_0). Alternate assets
  // are only used when the caller explicitly selects custom_background.
  const resolvedBackground = backgroundVariant ?? 'bg0';
  const changeSection = (section: LunarSection) => {
    if (section === activeSection) return;
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
      className="flex h-full min-h-0 flex-col justify-center gap-3 p-3"
      data-lunar-section-content="base"
    >
      <button
        type="button"
        className="flex items-center gap-3 text-left"
        data-card-interactive
        onClick={() => setCompactDetails((open) => !open)}
      >
        <MoonPhaseVisual model={selectedModel} language={language} className="h-20 w-20" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {getMoonPhaseName(selectedModel.phaseKey, language)}
          </p>
          <p className="mt-1 text-sm text-current/70 tabular-nums">
            {selectedModel.illuminationPercent}% {language === 'zh' ? '照明' : 'illuminated'}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[0.62rem]">
            <span>
              <span className="block text-current/45">{language === 'zh' ? '月龄' : 'Age'}</span>
              {selectedModel.ageDays.toFixed(1)}
            </span>
            <span>
              <span className="block text-current/45">{language === 'zh' ? '月出' : 'Rise'}</span>
              {selectedModel.moonrise?.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              }) ?? '—'}
            </span>
            <span>
              <span className="block text-current/45">{language === 'zh' ? '月落' : 'Set'}</span>
              {selectedModel.moonset?.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              }) ?? '—'}
            </span>
          </div>
        </div>
      </button>
      {compactDetails ? (
        <MoonDataSwiper model={selectedModel} language={language} chunkedLimit={4} />
      ) : null}
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
      <LazyMoonHorizonChart
        date={selectedDate}
        location={selectedModel.location}
        language={language}
        model={selectedModel}
      />
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
      title={title}
      fullBleed
      themeOverride={theme}
      frameClassName={`overflow-hidden !shadow-none ${
        mode === 'expanded' ? 'h-[min(28rem,62vh)] min-h-[22rem]' : ''
      }`}
      contentClassName="h-full"
      disableDefaultSheen
      underlay={<LunarBackground variant={resolvedBackground} />}
    >
      <div
        className="relative flex h-full min-h-0 flex-col"
        data-home-os-moon-card="interactive-upstream-port"
        data-lunar-mode={mode}
        data-lunar-size={size}
        data-lunar-active-section={activeSection}
        data-moon-source={selectedModel.source}
        data-lunar-location-source={selectedModel.locationSource}
        data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
        data-theme={theme ?? activeTheme}
        style={resolvedBackground === 'none' ? undefined : { color: '#e1e1e1' }}
      >
        {!small && !hideStarfield ? (
          <Suspense fallback={null}>
            <LazyLunarStarfield density={large ? 'large' : 'medium'} />
          </Suspense>
        ) : null}
        {!small && activeSection !== 'full_calendar' ? (
          <header
            className="relative z-10 flex h-9 shrink-0 items-center gap-2 px-3"
            data-card-interactive
          >
            <span className="mr-auto truncate text-sm font-medium text-current/80">
              {getMoonPhaseName(selectedModel.phaseKey, language)}
            </span>
            <nav
              className="flex items-center gap-0.5"
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
                section="calendar"
                active={activeSection === 'calendar'}
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
            </nav>
          </header>
        ) : null}
        <div
          className={`relative z-10 min-h-0 flex-1 overflow-hidden ${
            small ? '' : activeSection === 'full_calendar' ? 'p-1.5' : 'px-3 pb-2'
          } ${changing ? 'opacity-0' : 'opacity-100'} ${reducedMotion ? 'duration-0' : 'duration-[500ms]'} transition-opacity ease-in-out`}
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
