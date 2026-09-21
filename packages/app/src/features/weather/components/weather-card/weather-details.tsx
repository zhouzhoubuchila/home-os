import { CaptionValue } from '@navet/app/components/ui/caption-value';
import { useI18n } from '@navet/app/hooks';
import { formatMetricNumber } from '@navet/app/hooks/entity-utils';
import type { WeatherMetricId } from '@navet/app/stores/settings-store';
import {
  formatTemperatureFromSourceUnit,
  formatTemperatureValueFromSourceUnit,
  getTemperatureUnitSymbol,
  type TemperatureUnit,
} from '@navet/app/utils/temperature';
import type { CSSProperties } from 'react';

interface WeatherDetailsProps {
  temperature?: number;
  temperatureUnit?: TemperatureUnit;
  highTemp?: number;
  highTempUnit?: TemperatureUnit;
  lowTemp?: number;
  lowTempUnit?: TemperatureUnit;
  feelsLikeTemperature?: number;
  feelsLikeTemperatureUnit?: TemperatureUnit;
  displayTemperatureUnit: TemperatureUnit;
  rainForecast?: string;
  precipitation?: number;
  precipitationUnit?: string;
  humidity?: number;
  windSpeed?: number;
  windSpeedUnit?: string;
  windGustSpeed?: number;
  pressure?: number;
  pressureUnit?: string;
  uvIndex?: number;
  cloudCoverage?: number;
  showTemperatureSummary?: boolean;
  selectedMetricIds: WeatherMetricId[];
  textPrimary: string;
  textSecondary: string;
  textShadow?: string;
  titleStyle: CSSProperties;
  subtitleStyle: CSSProperties;
}

export function WeatherDetails({
  temperature,
  temperatureUnit,
  highTemp,
  highTempUnit,
  lowTemp,
  lowTempUnit,
  feelsLikeTemperature,
  feelsLikeTemperatureUnit,
  displayTemperatureUnit,
  rainForecast,
  precipitation,
  precipitationUnit,
  humidity,
  windSpeed,
  windSpeedUnit = 'km/h',
  windGustSpeed,
  pressure,
  pressureUnit = 'hPa',
  uvIndex,
  cloudCoverage,
  showTemperatureSummary = true,
  selectedMetricIds,
  textPrimary,
  textSecondary,
  textShadow,
  titleStyle,
  subtitleStyle,
}: WeatherDetailsProps) {
  const { t } = useI18n();
  const precipitationValue = precipitation !== undefined
    ? `${precipitation}${precipitationUnit ? ` ${precipitationUnit}` : ''}`
    : '';
  const formatTemperature = (value: number, sourceUnit?: TemperatureUnit) =>
    formatTemperatureFromSourceUnit(value, sourceUnit, displayTemperatureUnit).replace('°', ' °');
  const formatTemperatureValue = (value: number, sourceUnit?: TemperatureUnit) =>
    `${formatTemperatureValueFromSourceUnit(value, sourceUnit, displayTemperatureUnit)} ${getTemperatureUnitSymbol(displayTemperatureUnit)}`;
  const metricsById: Partial<Record<WeatherMetricId, { caption: string; value: string }>> = {
    precipitation: precipitation !== undefined && precipitation > 0 ? {
      caption: t('weather.precipitation'),
      value: precipitationValue,
    } : undefined,
    humidity: humidity !== undefined ? {
      caption: t('weather.humidity'),
      value: `${humidity}%`,
    } : undefined,
    wind: windSpeed !== undefined ? {
      caption: t('weather.wind'),
      value: `${windSpeed} ${windSpeedUnit}`,
    } : undefined,
    feelsLike:
      typeof feelsLikeTemperature === 'number'
        ? {
            caption: t('weather.metric.feelsLike'),
            value: formatTemperature(feelsLikeTemperature, feelsLikeTemperatureUnit),
          }
        : undefined,
    windGust:
      typeof windGustSpeed === 'number'
        ? {
            caption: t('weather.windGust'),
            value: `${formatMetricNumber(windGustSpeed)} ${windSpeedUnit}`,
          }
        : undefined,
    pressure:
      typeof pressure === 'number' && pressure > 0
        ? {
            caption: t('weather.pressure'),
            value: `${formatMetricNumber(pressure)} ${pressureUnit}`,
          }
        : undefined,
    uvIndex:
      typeof uvIndex === 'number'
        ? {
            caption: t('weather.uvIndex'),
            value: formatMetricNumber(uvIndex),
          }
        : undefined,
    cloudCover:
      typeof cloudCoverage === 'number'
        ? {
            caption: t('weather.cloudCover'),
            value: `${Math.round(cloudCoverage)}%`,
          }
        : undefined,
  };
  const visibleMetrics = selectedMetricIds
    .map((metricId) => metricsById[metricId])
    .filter((metric): metric is { caption: string; value: string } => Boolean(metric))
    .slice(0, 5);

  const hasTemperatureSummary = showTemperatureSummary && (
    temperature !== undefined ||
    highTemp !== undefined ||
    lowTemp !== undefined ||
    Boolean(rainForecast)
  );

  return (
    <div className={`flex w-full items-end gap-4 ${hasTemperatureSummary ? 'justify-between' : 'justify-end'}`}>
      {hasTemperatureSummary ? <div className="min-w-0 shrink-0">
        {temperature !== undefined ? (
          <div className="mb-1 text-3xl font-bold leading-none" style={titleStyle}>
            {formatTemperature(temperature, temperatureUnit)}
          </div>
        ) : null}
        {highTemp !== undefined || lowTemp !== undefined ? (
          <div className="mb-0.5 text-sm" style={subtitleStyle}>
            {highTemp !== undefined ? `H:${formatTemperatureValue(highTemp, highTempUnit)}` : null}
            {highTemp !== undefined && lowTemp !== undefined ? ' ' : null}
            {lowTemp !== undefined ? `L:${formatTemperatureValue(lowTemp, lowTempUnit)}` : null}
          </div>
        ) : null}
        {rainForecast ? (
          <div className="text-sm" style={subtitleStyle}>
            {rainForecast}
          </div>
        ) : null}
      </div> : null}

      <div className={`${hasTemperatureSummary ? 'shrink-0' : 'w-full'} space-y-0.5 text-right`}>
        {visibleMetrics.map((metric) => (
          <CaptionValue
            key={metric.caption}
            caption={metric.caption}
            value={metric.value}
            align="right"
            captionStyle={{
              color: textSecondary,
              textShadow,
            }}
            valueStyle={{
              color: textPrimary,
              textShadow,
            }}
          />
        ))}
      </div>
    </div>
  );
}
