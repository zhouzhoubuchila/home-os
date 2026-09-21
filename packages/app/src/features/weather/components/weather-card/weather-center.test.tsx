import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeatherCenter } from './weather-center';
import { getWeatherChartAvailability } from './weather-chart';

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

  it('tracks chart series availability without manufacturing missing metrics', () => {
    const availability = getWeatherChartAvailability([
      {
        datetime: '2026-09-21T12:00:00Z',
        temperature: 28,
        temperatureLow: 23,
        precipitationAmount: 1.2,
        humidity: 74,
      },
    ]);

    expect(availability).toMatchObject({
      temperature: true,
      lowTemperature: true,
      precipitation: true,
      humidity: true,
      apparentTemperature: false,
      pressure: false,
      uvIndex: false,
    });
  });

  it('hides unavailable metric options and falls back to daily twice-daily data', () => {
    renderWithProviders(
      <WeatherCenter
        model={{
          entityId: 'weather.home',
          current: { condition: 'cloudy', temperature: 23, temperatureUnit: 'celsius' },
          forecast: {
            hourly: [],
            daily: [],
            twiceDaily: [
              {
                datetime: '2026-09-21T12:00:00Z',
                temperature: 28,
                temperatureLow: 23,
                precipitationProbability: 40,
              },
            ],
          },
          capabilities: { hourly: false, daily: false, twiceDaily: true },
        }}
        title="Weather"
        theme="light"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('option', { name: /Temperature/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Pressure/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Humidity/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Daily forecast/ })).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('formats ISO sunrise and sunset values for the current locale', () => {
    renderWithProviders(
      <WeatherCenter
        model={{
          entityId: 'weather.home',
          current: {
            condition: 'sunny',
            temperature: 23,
            temperatureUnit: 'celsius',
            sunrise: '2026-09-21T21:59:30.715Z',
            sunset: '2026-09-21T11:09:30.715Z',
          },
          forecast: { hourly: [], daily: [], twiceDaily: [] },
          capabilities: { hourly: false, daily: false, twiceDaily: false },
        }}
        title="Weather"
        theme="dark"
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText(/2026-09-21T21:59/)).not.toBeInTheDocument();
    expect(screen.getByText(/Sunrise/)).toBeInTheDocument();
  });
});
