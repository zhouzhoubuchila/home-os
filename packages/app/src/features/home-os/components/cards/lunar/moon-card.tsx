import { BaseCard } from '@navet/app/components/primitives';
import { LUNAR_WEATHER_CARD_TOKENS } from '@navet/app/components/shared/theme/lunar-weather-card-tokens';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { CalendarDays, ChartNoAxesCombined, Clock3, Moon, Sunrise, Sunset } from 'lucide-react';
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
export type LunarCompactMode = 'standard' | 'minimal' | 'moon-only';
export type LunarMoonPosition = 'left' | 'center' | 'right';

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
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the upstream moon image exposes keyboard focus for hover parity
      tabIndex={0}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - bounds.left) / bounds.width) * 100,
          y: ((event.clientY - bounds.top) / bounds.height) * 100,
        });
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (!touch) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        setHovered(true);
        setPointer({
          x: ((touch.clientX - bounds.left) / bounds.width) * 100,
          y: ((touch.clientY - bounds.top) / bounds.height) * 100,
        });
      }}
      onTouchEnd={() => setHovered(false)}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
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
      className={`${LUNAR_WEATHER_CARD_TOKENS.headerControl} text-[0.6rem] ${
        active ? 'text-[var(--accent-color)] opacity-90' : 'text-current/38 hover:text-current/65'
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
  vertical = false,
  moonPosition = 'left',
  moonSize: moonSizeOverride,
  maxDataPerPage,
  hideItems,
}: {
  model: MoonCardModel;
  language: string;
  vertical?: boolean;
  moonPosition?: LunarMoonPosition;
  moonSize?: number;
  maxDataPerPage?: number;
  hideItems?: readonly string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [computedMoonSize, setMoonSize] = useState(150);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const width = root.clientWidth;
      const contentHeight = root.clientHeight;
      setCardWidth(width);
      const availableHeight = width * 0.5 - root.offsetTop;
      const actualAvailableHeight = contentHeight > 0 ? contentHeight : Number.POSITIVE_INFINITY;
      setMoonSize(
        moonSizeOverride ?? Math.min(width / 3.2, availableHeight, actualAvailableHeight, 150)
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [moonSizeOverride]);

  return (
    <div
      ref={rootRef}
      className={`[container-type:inline-size] flex h-full min-h-0 gap-4 px-2 sm:gap-6 ${
        vertical || moonPosition === 'center'
          ? 'grid grid-rows-[auto_auto] content-center items-center justify-items-center gap-2'
          : moonPosition === 'right'
            ? 'flex-row-reverse items-center'
            : 'items-center'
      }`}
      data-lunar-section-content="base"
      data-lunar-base="upstream"
    >
      <div
        className={`flex h-auto min-w-0 items-center justify-center ${
          vertical || moonPosition === 'center' ? 'w-full' : 'flex-1'
        }`}
      >
        <MoonPhaseVisual
          model={model}
          language={language}
          className="h-full w-full"
          style={{ maxWidth: computedMoonSize, maxHeight: computedMoonSize }}
        />
      </div>
      <div
        className={`flex h-full min-w-0 min-h-0 flex-col justify-center ${
          vertical || moonPosition === 'center' ? 'w-full items-center px-1' : 'flex-1'
        }`}
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <MoonDataSwiper
            model={model}
            language={language}
            maxDataPerPage={maxDataPerPage}
            hideItems={hideItems}
            cardWidth={cardWidth}
          />
        </div>
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
  hideBackground?: boolean;
  customBackground?: string;
  hideButtons?: boolean;
  compactView?: boolean;
  compactMode?: LunarCompactMode;
  compactMenuButton?: boolean;
  moonPosition?: LunarMoonPosition;
  moonSize?: number;
  hideItems?: readonly string[];
  maxDataPerPage?: number;
  southernHemisphere?: boolean;
  hide_background?: boolean;
  custom_background?: string;
  hide_starfield?: boolean;
  hide_buttons?: boolean;
  compact_view?: boolean;
  compact_mode?: LunarCompactMode;
  compact_menu_button?: boolean;
  moon_position?: LunarMoonPosition;
  moon_size?: number;
  hide_items?: readonly string[];
  max_data_per_page?: number;
  southern_hemisphere?: boolean;
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
  hideBackground = false,
  customBackground,
  hideButtons = false,
  compactView = false,
  compactMode,
  compactMenuButton = false,
  moonPosition = 'left',
  moonSize,
  hideItems = [],
  maxDataPerPage,
  southernHemisphere,
  hide_background: hideBackgroundAlias,
  custom_background: customBackgroundAlias,
  hide_starfield: hideStarfieldAlias,
  hide_buttons: hideButtonsAlias,
  compact_view: compactViewAlias,
  compact_mode: compactModeAlias,
  compact_menu_button: compactMenuButtonAlias,
  moon_position: moonPositionAlias,
  moon_size: moonSizeAlias,
  hide_items: hideItemsAlias,
  max_data_per_page: maxDataPerPageAlias,
  southern_hemisphere: southernHemisphereAlias,
  theme,
  mode = 'dashboard',
  initialSection = 'base',
  backgroundVariant,
}: InteractiveLunarCardProps) {
  hideBackground = hideBackground || hideBackgroundAlias === true;
  customBackground = customBackground ?? customBackgroundAlias;
  hideStarfield = hideStarfield || hideStarfieldAlias === true;
  hideButtons = hideButtons || hideButtonsAlias === true;
  compactView = compactView || compactViewAlias === true;
  compactMode = compactMode ?? compactModeAlias;
  compactMenuButton = compactMenuButton || compactMenuButtonAlias === true;
  moonPosition = moonPositionAlias ?? moonPosition;
  moonSize = moonSizeAlias ?? moonSize;
  hideItems = hideItemsAlias ?? hideItems;
  maxDataPerPage = maxDataPerPageAlias ?? maxDataPerPage;
  southernHemisphere = southernHemisphereAlias ?? southernHemisphere;
  const { theme: activeTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const compact =
    mode === 'dashboard' &&
    (compactView || size === 'small' || size === 'tiny' || size === 'extra-small');
  const resolvedCompactMode =
    compactMode ??
    (size === 'tiny' ? 'moon-only' : size === 'extra-small' ? 'minimal' : 'standard');
  const large =
    mode === 'expanded' || size === 'large' || size === 'extra-large' || size === 'extra-wide';
  const [activeSection, setActiveSection] = useState<LunarSection>(
    compact ? 'base' : initialSection
  );
  const [changing, setChanging] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date(model.date));
  const [compactDetails, setCompactDetails] = useState(false);
  const selectedModel = useMemo(
    () =>
      sameDay(selectedDate, model.date) ? model : buildMoonCardModelForDate(model, selectedDate),
    [model, selectedDate]
  );
  const displayModel = useMemo(
    () =>
      southernHemisphere === undefined ? selectedModel : { ...selectedModel, southernHemisphere },
    [selectedModel, southernHemisphere]
  );
  // Upstream defaults every section to BLUE_BG (moon_bg_0). Alternate assets
  // are only used when the caller explicitly selects custom_background.
  const resolvedBackground = backgroundVariant ?? 'bg0';
  const compactTime = (value?: Date) =>
    value?.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }) ?? '—';
  const compactItem = (icon: typeof Clock3, label: string, value: string) => {
    const Icon = icon;
    return (
      <div className="flex min-w-0 flex-col items-center gap-0.5 text-[0.65rem]" key={label}>
        <div className="flex items-center gap-1 tabular-nums">
          <Icon className="h-3.5 w-3.5 text-current/60" />
          <span>{value}</span>
        </div>
        <span className="truncate text-current/55">{label}</span>
      </div>
    );
  };
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

  const compactDetailsContent = (
    <div
      className="flex h-full min-h-0 flex-col justify-center gap-2 p-2"
      data-lunar-compact-details
    >
      <button
        type="button"
        className="mx-auto text-xs text-current/60"
        data-card-interactive
        onClick={() => setCompactDetails(false)}
      >
        {language === 'zh' ? '返回月相' : 'Back to moon'}
      </button>
      <div className="flex items-center justify-center gap-1 text-xs text-current/60">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{displayModel.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
      </div>
      <MoonDataSwiper
        model={displayModel}
        language={language}
        chunkedLimit={4}
        maxDataPerPage={4}
        hideItems={hideItems}
      />
    </div>
  );
  const compactMainContent =
    resolvedCompactMode === 'moon-only' ? (
      <button
        type="button"
        className={`flex h-full min-h-0 w-full items-center p-2 ${
          moonPosition === 'left'
            ? 'justify-start'
            : moonPosition === 'right'
              ? 'justify-end'
              : 'justify-center'
        }`}
        style={{ '--moon-size': `${moonSize ?? 100}%` } as CSSProperties}
        data-card-interactive
        data-lunar-compact-mode="moon-only"
        onClick={() => setCompactDetails(true)}
      >
        <MoonPhaseVisual
          model={displayModel}
          language={language}
          className="h-auto w-[var(--moon-size)] max-w-[150px]"
        />
      </button>
    ) : resolvedCompactMode === 'minimal' ? (
      <div
        className="grid h-full min-h-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2"
        data-lunar-compact-mode="minimal"
      >
        <button
          type="button"
          className="flex flex-col items-center text-center text-xs"
          data-card-interactive
          onClick={() => setCompactDetails(true)}
        >
          <span className="text-current/55">{language === 'zh' ? '月出' : 'Rise'}</span>
          <span className="font-medium tabular-nums">{compactTime(displayModel.moonrise)}</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center"
          data-card-interactive
          onClick={() => setCompactDetails(true)}
        >
          <MoonPhaseVisual model={displayModel} language={language} className="h-16 w-16" />
          <span className="mt-1 truncate text-xs font-medium">
            {getMoonPhaseName(displayModel.phaseKey, language)}
          </span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center text-center text-xs"
          data-card-interactive
          onClick={() => setCompactDetails(true)}
        >
          <span className="text-current/55">{language === 'zh' ? '月落' : 'Set'}</span>
          <span className="font-medium tabular-nums">{compactTime(displayModel.moonset)}</span>
        </button>
      </div>
    ) : (
      <div
        className="flex h-full min-h-0 flex-col justify-center gap-2 px-2"
        data-lunar-compact-mode="standard"
      >
        <button
          type="button"
          className="flex min-h-0 items-center gap-3 text-left"
          data-card-interactive
          onClick={() => setCompactDetails(true)}
        >
          <MoonPhaseVisual model={displayModel} language={language} className="h-20 w-20" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {getMoonPhaseName(displayModel.phaseKey, language)}
            </div>
            <div className="mt-1 text-sm text-current/70 tabular-nums">
              {displayModel.illuminationPercent}% {language === 'zh' ? '照明' : 'illuminated'}
            </div>
          </div>
        </button>
        <div className="grid grid-cols-3 gap-2">
          {compactItem(
            Clock3,
            language === 'zh' ? '月龄' : 'Moon age',
            `${displayModel.ageDays.toFixed(1)}d`
          )}
          {compactItem(
            Sunrise,
            language === 'zh' ? '月出' : 'Moonrise',
            compactTime(displayModel.moonrise)
          )}
          {compactItem(
            Sunset,
            language === 'zh' ? '月落' : 'Moonset',
            compactTime(displayModel.moonset)
          )}
        </div>
      </div>
    );
  const content = compact ? (
    compactDetails ? (
      compactDetailsContent
    ) : (
      compactMainContent
    )
  ) : activeSection === 'base' ? (
    <PhaseBase
      model={displayModel}
      language={language}
      vertical={size === 'medium-vertical'}
      moonPosition={moonPosition}
      moonSize={moonSize}
      maxDataPerPage={maxDataPerPage}
      hideItems={hideItems}
    />
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
        location={displayModel.location}
        language={language}
        model={displayModel}
      />
    </Suspense>
  ) : activeSection === 'full_calendar' ? (
    <FullMoonCalendar
      selectedDate={selectedDate}
      model={displayModel}
      language={language}
      onSelect={setSelectedDate}
      onClose={() => changeSection('calendar')}
    />
  ) : activeSection === 'calendar' && large && initialSection === 'calendar' ? (
    <FullMoonCalendar
      selectedDate={selectedDate}
      model={displayModel}
      language={language}
      onSelect={setSelectedDate}
      onClose={() => changeSection('base')}
    />
  ) : (
    <CompactMoonCalendar
      selectedDate={selectedDate}
      model={displayModel}
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
      underlay={
        hideBackground ? null : (
          <LunarBackground variant={resolvedBackground} customBackground={customBackground} />
        )
      }
    >
      <div
        className="relative flex h-full min-h-0 flex-col"
        data-home-os-moon-card="interactive-upstream-port"
        data-lunar-mode={mode}
        data-lunar-size={size}
        data-lunar-active-section={activeSection}
        data-moon-source={displayModel.source}
        data-lunar-location-source={displayModel.locationSource}
        data-upstream-commit={UPSTREAM_LUNAR_PHASE_CARD_COMMIT}
        data-theme={theme ?? activeTheme}
        style={hideBackground || resolvedBackground === 'none' ? undefined : { color: '#e1e1e1' }}
      >
        {!hideStarfield ? (
          <Suspense fallback={null}>
            <LazyLunarStarfield density={large ? 'large' : 'medium'} />
          </Suspense>
        ) : null}
        {!hideButtons &&
        (!compact || resolvedCompactMode === 'standard') &&
        activeSection !== 'full_calendar' ? (
          <header
            className={`${LUNAR_WEATHER_CARD_TOKENS.header} h-9 shrink-0 px-3`}
            data-card-interactive
          >
            <span className={`${LUNAR_WEATHER_CARD_TOKENS.headerTitle} mr-auto text-current/80`}>
              {getMoonPhaseName(selectedModel.phaseKey, language)}
            </span>
            <nav
              className="flex items-center gap-0.5"
              aria-label={language === 'zh' ? '月相卡片视图' : 'Lunar card sections'}
              data-lunar-compact-menu={compactMenuButton}
            >
              <SectionControl
                section="base"
                active={activeSection === 'base'}
                disabled={changing}
                language={language}
                onSelect={changeSection}
              />
              {!compact ? (
                <>
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
                </>
              ) : null}
            </nav>
          </header>
        ) : null}
        <div
          className={`relative z-10 min-h-0 flex-1 overflow-hidden ${
            compact ? '' : activeSection === 'full_calendar' ? 'p-1.5' : 'px-3 pb-2'
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
