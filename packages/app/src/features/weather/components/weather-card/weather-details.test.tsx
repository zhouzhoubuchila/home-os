import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherDetails } from './weather-details';

describe('WeatherDetails', () => {
  it('can render Large-card metrics without repeating the current temperature block', () => {
    renderWithProviders(
      <WeatherDetails
        temperature={28}
        temperatureUnit="celsius"
        highTemp={28}
        highTempUnit="celsius"
        lowTemp={23}
        lowTempUnit="celsius"
        displayTemperatureUnit="celsius"
        humidity={65}
        selectedMetricIds={['humidity']}
        showTemperatureSummary={false}
        textPrimary="#fff"
        textSecondary="#aaa"
        titleStyle={{}}
        subtitleStyle={{}}
      />
    );

    expect(screen.queryByText('28 °C')).not.toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });
});
