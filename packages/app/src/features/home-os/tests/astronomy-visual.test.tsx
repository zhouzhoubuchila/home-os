import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AstronomyVisual, getAstronomySnapshot } from '../astronomy/astronomy-visual';
import { resolveSemanticEntities } from '../mapping/semantic-resolver';
import { homeOsEntity } from './fixtures';

describe('Home OS astronomy visual', () => {
  const entities = resolveSemanticEntities([
    homeOsEntity({
      externalId: 'sun.sun',
      primaryState: 'above_horizon',
      attributes: {
        next_rising: '2026-09-03T05:42:00+08:00',
        next_setting: '2026-09-02T18:28:00+08:00',
        elevation: 42,
        azimuth: 188,
      },
    }),
  ]);

  it('renders the current phase and an SVG sun path', () => {
    const html = renderToStaticMarkup(
      <AstronomyVisual
        entities={entities}
        language="zh"
        now={new Date('2026-09-02T12:00:00+08:00')}
      />
    );
    expect(html).toContain('data-astronomy-card="true"');
    expect(html).toContain('data-moon-phase=');
    expect(html).toContain('<svg');
  });

  it('disables sun transition for reduced motion and exposes HA sun metadata', () => {
    const html = renderToStaticMarkup(
      <AstronomyVisual
        entities={entities}
        language="en"
        now={new Date('2026-09-02T12:00:00+08:00')}
      />
    );
    expect(html).toContain('motion-reduce:transition-none');
    expect(getAstronomySnapshot(entities).azimuth).toBe(188);
  });
});
