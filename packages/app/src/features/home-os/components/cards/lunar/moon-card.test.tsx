import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveSemanticEntities } from '../../../mapping/semantic-resolver';
import { homeOsEntity } from '../../../tests/fixtures';
import { HomeOsWidget } from '../home-os-widget';
import { MoonCard, MoonCardDetail, MoonPhaseVisual } from './moon-card';
import {
  buildMoonCardModel,
  createMoonCardFixture,
  getMoonPhaseKey,
  getMoonPhaseName,
  type MoonPhaseKey,
} from './moon-card-model';

const PHASES: MoonPhaseKey[] = [
  'new_moon',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full_moon',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('interactive Lunar Phase Card port', () => {
  it('maps all eight phase sectors and localized names', () => {
    expect(PHASES.map((_, index) => getMoonPhaseKey(index / 8))).toEqual(PHASES);
    expect(PHASES.map((phase) => getMoonPhaseName(phase, 'zh'))).toEqual([
      '新月',
      '蛾眉月',
      '上弦月',
      '盈凸月',
      '满月',
      '亏凸月',
      '下弦月',
      '残月',
    ]);
  });

  it.each(PHASES)('renders the upstream %s image mapping', (phase) => {
    const { container } = renderWithProviders(
      <MoonPhaseVisual model={createMoonCardFixture(phase)} language="en" />
    );
    expect(container.querySelector('[data-upstream-moon-image="true"]')).toHaveAttribute(
      'data-moon-phase',
      phase
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('_moon.webp')
    );
  });

  it.each([
    [0, 0],
    [0.2, 20],
    [0.5, 50],
    [1, 100],
  ])('converts illumination %s to %s percent', (illumination, percent) => {
    expect(
      createMoonCardFixture('first_quarter', {
        illumination,
        illuminationPercent: Math.round(illumination * 100),
      }).illuminationPercent
    ).toBe(percent);
  });

  it('prefers an available HA moon entity and Home location', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'moon.home',
        primaryState: 'waning_gibbous',
        availability: 'available',
      }),
      homeOsEntity({
        externalId: 'zone.home',
        attributes: { latitude: 35.6762, longitude: 139.6503 },
      }),
    ]);
    expect(buildMoonCardModel(entities, new Date('2026-09-19T12:00:00Z'))).toMatchObject({
      phaseKey: 'waning_gibbous',
      source: 'entity',
      phaseImageIndex: 19,
      location: { latitude: 35.6762, longitude: 139.6503 },
    });
  });

  it('keeps a stable fallback when the moon entity is unavailable', () => {
    const now = new Date('2026-09-19T12:00:00Z');
    const unavailable = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'moon.home',
        primaryState: 'full_moon',
        availability: 'unavailable',
      }),
    ]);
    const first = buildMoonCardModel(unavailable, now);
    const second = buildMoonCardModel([], now);
    expect(first).toMatchObject({
      source: 'calculated',
      phase: second.phase,
      phaseKey: second.phaseKey,
      illuminationPercent: second.illuminationPercent,
    });
  });

  it.each(['small', 'medium', 'large'] as const)('renders the %s card without emoji', (size) => {
    const { container } = renderWithProviders(
      <MoonCard size={size} model={createMoonCardFixture('full_moon')} language="zh" />
    );
    expect(
      container.querySelector('[data-home-os-moon-card="interactive-upstream-port"]')
    ).toBeInTheDocument();
    expect(screen.getAllByText('满月').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/[🌑🌒🌓🌔🌕🌖🌗🌘]/u);
  });

  it('switches Medium between BASE, HORIZON and CALENDAR in place', async () => {
    const { container } = renderWithProviders(
      <MoonCard size="medium" model={createMoonCardFixture('waxing_gibbous')} language="zh" />
    );
    const root = container.querySelector('[data-home-os-moon-card]');
    expect(root).toHaveAttribute('data-lunar-active-section', 'base');
    fireEvent.click(screen.getByRole('button', { name: '月轨' }));
    await waitFor(() => expect(root).toHaveAttribute('data-lunar-active-section', 'horizon'));
    await waitFor(() =>
      expect(container.querySelector('[data-lunar-horizon]')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: '月历' }));
    await waitFor(() => expect(root).toHaveAttribute('data-lunar-active-section', 'calendar'));
    expect(container.querySelector('[data-lunar-calendar="compact"]')).toBeInTheDocument();
  });

  it('does not open Detail from a section control but blank card clicks still do', async () => {
    const { container } = renderWithProviders(
      <HomeOsWidget size="medium" data={{ kind: 'lunar' }} isEditMode={false} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Horizon|月轨/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const cardSurface = container.querySelector<HTMLElement>('[data-home-os-detail]');
    expect(cardSurface).toBeInTheDocument();
    if (cardSurface) fireEvent.click(cardSurface);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('uses upstream Swiper with grab, keyboard and clickable pagination', async () => {
    const { container } = renderWithProviders(
      <MoonCard size="medium" model={createMoonCardFixture('first_quarter')} language="en" />
    );
    const swiper = container.querySelector('[data-lunar-swiper]');
    expect(swiper).toHaveAttribute('data-lunar-swiper-grab-cursor', 'true');
    expect(swiper).toHaveAttribute('data-lunar-swiper-keyboard', 'true');
    await waitFor(() =>
      expect(container.querySelectorAll('.swiper-pagination-bullet').length).toBeGreaterThan(1)
    );
    const bullets = container.querySelectorAll<HTMLElement>('.swiper-pagination-bullet');
    fireEvent.click(bullets[1]);
    await waitFor(() => expect(bullets[1]).toHaveClass('swiper-pagination-bullet-active'));
  });

  it('lazy-loads Chart.js only after opening HORIZON and exposes its markers', async () => {
    const { container } = renderWithProviders(
      <MoonCard size="medium" model={createMoonCardFixture('waxing_crescent')} language="en" />
    );
    expect(container.querySelector('[data-lunar-horizon]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Horizon' }));
    await waitFor(() =>
      expect(container.querySelector('[data-chart-module="chart.js"]')).toBeInTheDocument()
    );
    expect(container.querySelector('[data-current-marker="true"]')).toBeInTheDocument();
    expect(
      container.querySelector('canvas[aria-label="Dynamic moon horizon chart"]')
    ).toBeInTheDocument();
  });

  it('moves the full calendar between months', () => {
    const { container } = renderWithProviders(
      <MoonCard
        size="large"
        model={createMoonCardFixture('waxing_gibbous')}
        language="zh"
        initialSection="calendar"
      />
    );
    const calendar = container.querySelector('[data-lunar-calendar="full"]');
    expect(calendar).toHaveAttribute('data-calendar-view', '2026-09');
    fireEvent.click(screen.getByRole('button', { name: '下个月' }));
    expect(calendar).toHaveAttribute('data-calendar-view', '2026-10');
    fireEvent.click(screen.getByRole('button', { name: '上个月' }));
    expect(calendar).toHaveAttribute('data-calendar-view', '2026-09');
  });

  it('selects a compact calendar date and updates the Moon model', () => {
    const { container } = renderWithProviders(
      <MoonCard
        size="medium"
        model={createMoonCardFixture('full_moon')}
        language="zh"
        initialSection="calendar"
      />
    );
    const root = container.querySelector('[data-home-os-moon-card]');
    expect(root).toHaveAttribute('data-moon-source', 'entity');
    const dates = container.querySelectorAll<HTMLButtonElement>(
      '[data-lunar-calendar="compact"] button[aria-pressed]'
    );
    fireEvent.click(dates[0]);
    expect(root).toHaveAttribute('data-moon-source', 'calculated');
  });

  it('opens FULL_CALENDAR from Medium without opening Detail', () => {
    const { container } = renderWithProviders(
      <MoonCard
        size="medium"
        model={createMoonCardFixture('first_quarter')}
        language="zh"
        initialSection="calendar"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /完整月历/ }));
    expect(
      container.querySelector('[data-lunar-active-section="full_calendar"]')
    ).toBeInTheDocument();
    expect(container.querySelector('[data-lunar-calendar="full"]')).toBeInTheDocument();
  });

  it('does not reset the active section after an entity refresh', async () => {
    const { container, rerender } = renderWithProviders(
      <MoonCard size="medium" model={createMoonCardFixture('first_quarter')} language="en" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Horizon' }));
    await waitFor(() =>
      expect(container.querySelector('[data-home-os-moon-card]')).toHaveAttribute(
        'data-lunar-active-section',
        'horizon'
      )
    );
    rerender(<MoonCard size="medium" model={createMoonCardFixture('full_moon')} language="en" />);
    expect(container.querySelector('[data-home-os-moon-card]')).toHaveAttribute(
      'data-lunar-active-section',
      'horizon'
    );
  });

  it('reuses the same interactive engine in Detail', () => {
    const { container } = renderWithProviders(
      <MoonCardDetail model={createMoonCardFixture('waxing_gibbous')} language="zh" />
    );
    expect(container.querySelector('[data-lunar-mode="expanded"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-os-moon-card]')).toBeInTheDocument();
    expect(container.querySelector('[data-astronomy-card="true"]')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[🌑🌒🌓🌔🌕🌖🌗🌘]/u);
  });

  it('honors reduced motion and keeps Medium clipped to its card', () => {
    const { container } = renderWithProviders(
      <MoonCard size="medium" model={createMoonCardFixture('full_moon')} language="en" />
    );
    expect(container.querySelector('.duration-0')).toBeInTheDocument();
    expect(
      container.querySelector('[data-home-os-moon-card]')?.closest('.overflow-hidden')
    ).toBeInTheDocument();
  });

  it('keeps Small as a graceful phase summary without heavy sections', () => {
    const { container } = renderWithProviders(
      <MoonCard size="small" model={createMoonCardFixture('new_moon')} language="en" />
    );
    expect(container.querySelector('[data-lunar-size="small"]')).toBeInTheDocument();
    expect(container.querySelector('[data-lunar-swiper]')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Horizon' })).not.toBeInTheDocument();
  });
});
