import {
  formatTemperatureValueFromSourceUnit,
  type TemperatureUnit,
} from '@navet/app/utils/temperature';
import type { CSSProperties } from 'react';
import type { ThemeType } from '@navet/app/hooks';
import type { ForecastDay } from './index';
import { WeatherIcon } from './weather-icon';

interface WeatherForecastRowProps {
  forecast: ForecastDay[];
  temperatureUnit: TemperatureUnit;
  defaultTemperatureUnit?: TemperatureUnit;
  showHourlyForecast: boolean;
  isSmall: boolean;
  isMedium: boolean;
  textPrimary: string;
  textSecondary: string;
  textShadow?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
  theme?: ThemeType;
}

export function WeatherForecastRow({
  forecast,
  temperatureUnit,
  defaultTemperatureUnit,
  showHourlyForecast,
  isSmall,
  isMedium,
  textPrimary,
  textSecondary,
  textShadow,
  titleStyle,
  subtitleStyle,
  theme = 'dark',
}: WeatherForecastRowProps) {
  const compactForecastDayTextClassName = isSmall ? 'text-xs' : 'text-sm';
  const compactForecastIconClassName = isSmall
    ? 'mx-auto mb-1 h-5 w-5'
    : isMedium
      ? 'mx-auto mb-0.5 h-5 w-5'
      : 'mx-auto mb-1 h-6 w-6';
  const compactForecastValueClassName = isSmall ? 'text-xs leading-none' : 'text-sm leading-none';
  const compactForecastDayClassName = isSmall ? 'mb-1' : isMedium ? 'mb-0.5' : 'mb-1';
  const weeklyValueClassName =
    isSmall || isMedium
      ? `flex items-center justify-center ${isSmall ? 'gap-1' : 'gap-1.5'}`
      : 'flex flex-col items-center justify-center gap-0.5';

  return (
    <div className={`flex w-full items-start justify-between ${isSmall ? 'gap-1' : 'gap-2'}`}>
      {forecast.map((day) => (
        <div key={day.day} className="min-w-0 text-center">
          <div
            className={`${compactForecastDayClassName} ${compactForecastDayTextClassName}`}
            style={{ color: textSecondary, textShadow }}
          >
            {day.day}
          </div>
          <WeatherIcon
            condition={day.condition}
            isNight={day.isDaytime === false}
            theme={theme}
            className={compactForecastIconClassName}
            style={{ color: textPrimary }}
          />
          {showHourlyForecast ? (
            <div className={`${compactForecastValueClassName} font-medium`} style={titleStyle}>
              {day.high !== undefined
                ? `${formatTemperatureValueFromSourceUnit(
                    day.high,
                    day.highUnit ?? defaultTemperatureUnit,
                    temperatureUnit
                  )}°`
                : null}
            </div>
          ) : (
            <div className={`${weeklyValueClassName} ${compactForecastValueClassName}`}>
              <span className="font-medium" style={titleStyle}>
                {day.high !== undefined
                  ? `${formatTemperatureValueFromSourceUnit(
                      day.high,
                      day.highUnit ?? defaultTemperatureUnit,
                      temperatureUnit
                    )}°`
                  : null}
              </span>
              <span style={subtitleStyle}>
                {day.low !== undefined
                  ? `${formatTemperatureValueFromSourceUnit(
                      day.low,
                      day.lowUnit ?? defaultTemperatureUnit,
                      temperatureUnit
                    )}°`
                  : null}
              </span>
            </div>
          )}
          {day.precipitationProbability !== undefined ? (
            <div className="mt-0.5 text-[10px] text-sky-500">{Math.round(day.precipitationProbability)}%</div>
          ) : day.precipitationAmount !== undefined && day.precipitationAmount > 0 ? (
            <div className="mt-0.5 text-[10px] text-sky-500">
              {day.precipitationAmount}{day.precipitationUnit ? ` ${day.precipitationUnit}` : ''}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
