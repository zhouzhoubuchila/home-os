import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { resolveSemanticEntities } from '../../../mapping/semantic-resolver';
import { homeOsEntity } from '../../../tests/fixtures';
import { HomeOsWidget } from '../home-os-widget';
import { MoonCard, MoonPhaseVisual } from './moon-card';
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

describe('Moon Card V2', () => {
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
    expect(getMoonPhaseName('waxing_gibbous', 'en')).toBe('Waxing gibbous');
  });

  it.each(PHASES)('renders the %s visual mapping', (phase) => {
    const { container } = renderWithProviders(
      <MoonPhaseVisual model={createMoonCardFixture(phase)} language="en" />
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-moon-phase', phase);
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

  it('keeps waxing and waning visual directions distinct', () => {
    const { container, rerender } = renderWithProviders(
      <MoonPhaseVisual model={createMoonCardFixture('waxing_crescent')} language="en" />
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-moon-direction', 'waxing');
    const waxingPath = container.querySelector('path')?.getAttribute('d');
    rerender(<MoonPhaseVisual model={createMoonCardFixture('waning_crescent')} language="en" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-moon-direction', 'waning');
    expect(container.querySelector('path')?.getAttribute('d')).not.toBe(waxingPath);
  });

  it('prefers an available HA moon entity', () => {
    const entities = resolveSemanticEntities([
      homeOsEntity({
        externalId: 'moon.home',
        primaryState: 'waning_gibbous',
        availability: 'available',
      }),
    ]);
    expect(buildMoonCardModel(entities, new Date('2026-09-19T12:00:00Z'))).toMatchObject({
      phaseKey: 'waning_gibbous',
      source: 'entity',
    });
  });

  it('uses a stable local calculation when the moon entity is missing or unavailable', () => {
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
    expect(first.source).toBe('calculated');
    expect(first).toMatchObject({
      phase: second.phase,
      phaseKey: second.phaseKey,
      illuminationPercent: second.illuminationPercent,
      ageDays: second.ageDays,
    });
  });

  it.each(['small', 'medium', 'large'] as const)('renders the %s card layout', (size) => {
    const model = createMoonCardFixture('full_moon');
    const { container } = renderWithProviders(<MoonCard size={size} model={model} language="zh" />);
    expect(container.querySelector('[data-home-os-moon-card="v2"]')).toBeInTheDocument();
    expect(screen.getByText('满月')).toBeInTheDocument();
  });

  it('keeps the HomeOsWidget lunar branch wired to Moon Card V2', () => {
    const { container } = renderWithProviders(
      <HomeOsWidget size="medium" data={{ kind: 'lunar' }} isEditMode={false} />
    );
    expect(container.querySelector('[data-home-os-moon-card="v2"]')).toBeInTheDocument();
  });
});
