import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { CalendarDays, ChartNoAxesCombined, Moon } from 'lucide-react';
import {
  type CSSProperties,
  lazy,
  type PointerEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const frame = useRef<number | undefined>(undefined);
  const reducedMotion = useReducedMotion();
  const [previousImage, setPreviousImage] = useState<string>();
  const [imageVisible, setImageVisible] = useState(true);
  const style = {
    '--moon-x': '0px',
    '--moon-y': '0px',
    '--moon-rx': '0deg',
    '--moon-ry': '0deg',
    '--moon-scale': '1',
    '--glow-x': '0px',
    '--glow-y': '0px',
    '--shadow-x': '0px',
    '--shadow-y': '0px',
  } as CSSProperties;

  const animate = () => {
    const nextX = current.current.x + (target.current.x - current.current.x) * 0.11;
    const nextY = current.current.y + (target.current.y - current.current.y) * 0.11;
    current.current = { x: nextX, y: nextY };
    const node = rootRef.current;
    if (node) {
      node.style.setProperty('--moon-x', `${(nextX * 5).toFixed(2)}px`);
      node.style.setProperty('--moon-y', `${(nextY * 4).toFixed(2)}px`);
      node.style.setProperty('--moon-rx', `${(nextY * -1.5).toFixed(2)}deg`);
      node.style.setProperty('--moon-ry', `${(nextX * 2).toFixed(2)}deg`);
      node.style.setProperty('--moon-scale', `${(1 + Math.abs(nextX + nextY) * 0.006).toFixed(4)}`);
      node.style.setProperty('--glow-x', `${(nextX * 2).toFixed(2)}px`);
      node.style.setProperty('--glow-y', `${(nextY * 1.7).toFixed(2)}px`);
      node.style.setProperty('--shadow-x', `${(nextX * -1).toFixed(2)}px`);
      node.style.setProperty('--shadow-y', `${(nextY * -0.8).toFixed(2)}px`);
    }
    if (Math.abs(target.current.x - nextX) > 0.01 || Math.abs(target.current.y - nextY) > 0.01) {
      frame.current = window.requestAnimationFrame(animate);
    } else {
      frame.current = undefined;
    }
  };

  useEffect(() => {
    setPreviousImage(model.moonImageUrl);
    setImageVisible(false);
    const timer = window.setTimeout(() => {
      setPreviousImage(undefined);
      setImageVisible(true);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [model.moonImageUrl]);

  useEffect(
    () => () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    },
    []
  );

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    target.current = {
      x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)),
      y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)),
    };
    if (!frame.current) frame.current = window.requestAnimationFrame(animate);
  };
  const onPointerLeave = () => {
    target.current = { x: 0, y: 0 };
    if (!reducedMotion && !frame.current) frame.current = window.requestAnimationFrame(animate);
  };
  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={
        language === 'zh'
          ? `${name}，照明 ${model.illuminationPercent}%`
          : `${name}, ${model.illuminationPercent}% illuminated`
      }
      className={`group relative aspect-square shrink-0 select-none [perspective:700px] motion-safe:animate-[navet-lunar-breathe_5s_ease-in-out_infinite] ${className}`}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      data-moon-phase={model.phaseKey}
      data-moon-direction={model.phase < 0.5 ? 'waxing' : 'waning'}
      data-upstream-moon-image="true"
      data-upstream-phase-index={model.phaseImageIndex}
      data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
    >
      <span
        className="pointer-events-none absolute inset-[18%] rounded-full bg-[rgb(226_232_240/0.12)] blur-2xl transition-transform duration-500 motion-reduce:transition-none"
        style={{ transform: 'translate(var(--glow-x), var(--glow-y))' }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-[25%] rounded-full bg-black/20 blur-xl transition-transform duration-500 motion-reduce:transition-none"
        style={{ transform: 'translate(var(--shadow-x), var(--shadow-y))' }}
        aria-hidden="true"
      />
      {previousImage ? (
        <img
          src={previousImage}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-contain grayscale opacity-100"
        />
      ) : null}
      <img
        src={model.moonImageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`pointer-events-none relative h-full w-full object-contain grayscale brightness-[0.96] drop-shadow-[var(--shadow-x)_var(--shadow-y)_10px_rgb(15_23_42/0.24)] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${imageVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transform:
            'translate3d(var(--moon-x), var(--moon-y), 0) rotateX(var(--moon-rx)) rotateY(var(--moon-ry)) scale(var(--moon-scale))',
        }}
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
      className={`flex h-6 items-center gap-1 rounded-md px-1.5 text-[0.6rem] transition-[background-color,opacity] disabled:opacity-50 ${
        active
          ? 'bg-current/[0.07] text-current/78'
          : 'text-current/38 hover:bg-current/[0.04] hover:text-current/65'
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
    <div
      className="flex h-full min-h-0 items-center gap-4 sm:gap-6"
      data-lunar-section-content="base"
    >
      <div className="flex w-[40%] min-w-[104px] max-w-[190px] items-center justify-center">
        <MoonPhaseVisual
          model={model}
          language={language}
          className={large ? 'h-40 w-40' : 'h-[7.1rem] w-[7.1rem]'}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <span className="mb-1 text-[0.62rem] uppercase tracking-[0.18em] text-current/42">
          {language === 'zh' ? '月相' : 'Lunar phase'}
        </span>
        <h2 className="truncate text-[1.2rem] font-semibold tracking-[-0.025em]">{phaseName}</h2>
        <div className="mt-1 flex items-end gap-1.5">
          <span className="text-[2.15rem] font-medium leading-none tracking-[-0.055em] tabular-nums">
            {model.illuminationPercent}%
          </span>
          <span className="mb-0.5 text-[0.62rem] text-current/48">
            {language === 'zh' ? '照明' : 'illuminated'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.68rem]">
          <div>
            <span className="block text-[0.6rem] text-current/42">
              {language === 'zh' ? '月龄' : 'Moon age'}
            </span>
            <span className="tabular-nums">
              {model.ageDays.toFixed(1)} {language === 'zh' ? '天' : 'days'}
            </span>
          </div>
          <div>
            <span className="block text-[0.6rem] text-current/42">
              {language === 'zh' ? '来源' : 'Source'}
            </span>
            <span className="truncate text-current/65">{sourceLabel(model.source, language)}</span>
          </div>
        </div>
        <div className="mt-3 h-[4.5rem] min-h-0">
          <MoonDataSwiper model={model} language={language} />
        </div>
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
    const timer = window.setTimeout(() => setChanging(false), reducedMotion ? 0 : 240);
    return () => window.clearTimeout(timer);
  }, [changing, reducedMotion]);

  const content = small ? (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center gap-1 p-3"
      data-lunar-section-content="base"
    >
      <MoonPhaseVisual
        model={selectedModel}
        language={language}
        className="h-16 w-16 motion-safe:animate-[navet-lunar-breathe_5s_ease-in-out_infinite]"
      />
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_26%_42%,rgba(226,232,240,0.07),transparent_38%)] dark:bg-[radial-gradient(circle_at_26%_42%,rgba(148,163,184,0.08),transparent_38%)]" />
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
        <style>{`@keyframes navet-lunar-breathe { 0%,100% { transform: translateY(-1px); opacity: .98; } 50% { transform: translateY(1px); opacity: 1; } } @media (prefers-reduced-motion: reduce) { .navet-lunar-breathe { animation: none !important; } }`}</style>
        {hasInteracted && large ? (
          <Suspense fallback={null}>
            <LazyLunarStarfield density={large ? 'large' : 'medium'} />
          </Suspense>
        ) : null}
        {!small && activeSection !== 'full_calendar' ? (
          <header
            className="relative z-10 flex h-9 shrink-0 items-center gap-2 px-3"
            data-card-interactive
          >
            <span className="mr-auto text-[0.58rem] uppercase tracking-[0.18em] text-current/35">
              {language === 'zh' ? '月相' : 'LUNAR'}
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
          } ${reducedMotion ? 'duration-0' : 'duration-[240ms]'}`}
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
