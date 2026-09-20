import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeatherCenter } from './weather-center';

describe('WeatherCenter', () => {
  it('renders through a document portal outside the card subtree', () => {
    const rendered = renderWithProviders(
      <div data-testid="card-root">
        <WeatherCenter
          model={{
            entityId: 'weather.home',
            current: { condition: 'sunny', temperature: 23, temperatureUnit: 'celsius' },
            forecast: { hourly: [], daily: [], twiceDaily: [] },
            capabilities: { hourly: false, daily: false, twiceDaily: false },
          }}
          title="Weather"
          theme="dark"
          onClose={vi.fn()}
        />
      </div>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(rendered.container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();

    rendered.unmount();
  });
});
