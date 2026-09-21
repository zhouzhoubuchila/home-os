import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { CardWrapper } from '@navet/app/components/ui/card-wrapper';
import { getLunarWeatherPanelClassName, LUNAR_WEATHER_CARD_TOKENS } from '@navet/app/components/shared/theme/lunar-weather-card-tokens';
import { useAccentColor, useI18n } from '@navet/app/hooks';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore, type WeatherForecastMode } from '@navet/app/stores/settings-store';
import type { TemperatureUnit } from '@navet/app/utils/temperature';
import { Navigation } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useWeatherCardController } from './use-weather-card-controller';
import { WeatherAtmosphere, WeatherBackground } from './weather-card-overlays';
import { WeatherDetails } from './weather-details';
import { WeatherForecastRow } from './weather-forecast-row';
import { formatWeatherConditionLabel, type WeatherCondition, WeatherIcon } from './weather-icon';
import { WeatherSettingsDialog } from './weather-settings-dialog';
import { WeatherSunTimes } from './weather-sun-times';
import {
  formatWeatherTemperature,
  resolveWeatherTemperatureUnit,
} from './weather-temperature';
import type { WeatherModel } from '@navet/app/features/weather/model/weather-model';
import { WeatherCenter } from './weather-center';
import { WeatherChart } from './weather-chart';

// Re-export types
export type { WeatherCondition };
export type ForecastDay = {
  day: string;
  condition: string;
  isDaytime?: boolean;
  high?: number;
  highUnit?: TemperatureUnit;
  low?: number;
  lowUnit?: TemperatureUnit;
  precipitationAmount?: number;
  precipitationProbability?: number;
  precipitationUnit?: string;
};

interface WeatherCardProps {
  model?: WeatherModel;
  id: string;
  title?: string;
  location: string;
  temperature?: number;
  temperatureUnit?: TemperatureUnit;
  feelsLikeTemperature?: number;
  feelsLikeTemperatureUnit?: TemperatureUnit;
  condition: WeatherCondition | string;
  humidity?: number;
  windSpeed?: number;
  windSpeedUnit?: string;
  windGustSpeed?: number;
  pressure?: number;
  pressureUnit?: string;
  uvIndex?: number;
  cloudCoverage?: number;
  precipitation?: number;
  precipitationUnit?: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  rainForecast: string;
  forecast: ForecastDay[];
  forecastMode: WeatherForecastMode;
  highTemp?: number;
  highTempUnit?: TemperatureUnit;
  lowTemp?: number;
  lowTempUnit?: TemperatureUnit;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export const WeatherCard = memo(function WeatherCard({
  model,
  id,
  title,
  location,
  temperature,
  temperatureUnit: sourceTemperatureUnit,
  feelsLikeTemperature,
  feelsLikeTemperatureUnit,
  condition,
  humidity,
  windSpeed,
  windSpeedUnit = 'km/h',
  windGustSpeed,
  pressure,
  pressureUnit = 'hPa',
  uvIndex,
  cloudCoverage,
  precipitation,
  precipitationUnit,
  sunrise,
  sunset,
  daylight,
  rainForecast,
  forecast,
  forecastMode: effectiveForecastMode,
  highTemp,
  highTempUnit,
  lowTemp,
  lowTempUnit,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
}: WeatherCardProps) {
  const { t, locale } = useI18n();
  const accentColor = useAccentColor();
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const {
    theme,
    effectiveEffectsQuality,
    surface,
    cardShell,
    shell,
    tintColor,
    tintSurface,
    hasCustomTint,
    weatherTintStyle,
    weatherTextTreatment,
    weatherShellClassName,
    isSettingsOpen,
    setIsSettingsOpen,
    isExpanded,
    setIsExpanded,
    interaction,
    cityName,
    selectedForecastMode,
    selectedMetricIds,
    updateSettings,
    setTintColor,
  } = useWeatherCardController({ id, location, condition, isEditMode });
  const cardTitle = title ?? cityName;

  const current = model?.current;
  const resolvedTemperature = current?.temperature ?? temperature;
  const modelTemperatureUnit = resolveWeatherTemperatureUnit(current?.temperatureUnit);
  const resolvedTemperatureUnit = modelTemperatureUnit ?? sourceTemperatureUnit;
  const resolvedFeelsLike = current?.apparentTemperature ?? feelsLikeTemperature;
  const resolvedFeelsLikeUnit = resolvedTemperatureUnit ?? feelsLikeTemperatureUnit;
  const resolvedHumidity = current?.humidity ?? humidity;
  const resolvedWindSpeed = current?.windSpeed ?? windSpeed;
  const resolvedWindUnit = current?.windSpeedUnit ?? windSpeedUnit;
  const resolvedWindGust = current?.windGust ?? windGustSpeed;
  const resolvedPressure = current?.pressure ?? pressure;
  const resolvedPressureUnit = current?.pressureUnit ?? pressureUnit;
  const resolvedUvIndex = current?.uvIndex ?? uvIndex;
  const resolvedCloudCoverage = current?.cloudCoverage ?? cloudCoverage;
  const resolvedPrecipitation = current?.precipitationAmount ?? precipitation;
  const resolvedPrecipitationUnit = current?.precipitationUnit ?? precipitationUnit;
  const isTiny = size === 'tiny';
  const isExtraSmall = size === 'extra-small';
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const isLarge = size === 'large';
  const usesDetailedLayout = isMedium || isLarge || size === 'medium-vertical' || size === 'extra-large' || size === 'extra-wide';
  const showHourlyForecast = effectiveForecastMode === 'hourly';
  const modelForecastType = showHourlyForecast && model?.forecast.hourly.length
    ? 'hourly'
    : model?.forecast.daily.length
      ? 'daily'
      : model?.forecast.twiceDaily.length
        ? 'twice_daily'
        : undefined;
  const modelForecast = modelForecastType && model
    ? (modelForecastType === 'twice_daily' ? model.forecast.twiceDaily : model.forecast[modelForecastType]).map((point, index) => ({
        day: point.datetime
          ? new Intl.DateTimeFormat(undefined, modelForecastType === 'hourly' ? { hour: 'numeric' } : { weekday: 'short' }).format(new Date(point.datetime))
          : `+${index + 1}`,
        condition: point.condition ?? current?.condition ?? condition,
        isDaytime: point.isDaytime,
        high: point.temperature,
        low: point.temperatureLow,
        highUnit: point.temperatureUnit ?? resolvedTemperatureUnit,
        lowUnit: point.temperatureUnit ?? resolvedTemperatureUnit,
        precipitationAmount: point.precipitationAmount,
        precipitationProbability: point.precipitationProbability,
        precipitationUnit: point.precipitationUnit,
      }))
    : [];
  const visibleForecast = (modelForecast.length > 0 ? modelForecast : forecast).slice(
    0,
    isSmall || isExtraSmall ? 4 : size === 'medium' ? 6 : 8
  );
  const summaryLabel = formatWeatherConditionLabel(current?.condition ?? condition, locale);
  const headerIconClassName = isLarge || size === 'extra-large' || size === 'extra-wide'
    ? 'h-24 w-24'
    : isSmall || usesDetailedLayout
      ? 'h-11 w-11'
      : 'h-10 w-10';
  const cardContentPaddingClassName = isTiny ? 'p-2' : isMedium ? 'px-3 py-2.5' : 'p-3';
  const compactHeaderClassName = isSmall
    ? 'mb-1.5 gap-2'
    : isMedium
      ? 'mb-1.5 gap-3'
      : 'mb-3 gap-3';
  const compactLocationRowClassName = 'gap-1.5';
  const compactLocationTextClassName = isSmall ? 'text-[13px]' : 'text-sm';
  const compactTemperatureTextClassName = isSmall ? 'text-[2rem]' : 'text-3xl';
  const compactMetaTextClassName = isSmall ? 'text-xs' : 'text-sm';
  const compactSummaryTextClassName = isSmall ? 'text-xs' : 'text-sm';
  const compactHeaderIconClassName = isSmall ? 'h-9 w-9' : headerIconClassName;
  const compactTemperatureBlockClassName = isSmall ? 'mt-1' : isMedium ? 'mt-1' : 'mt-1.5';
  const compactTemperatureClassName = isSmall ? 'mb-0.5' : isMedium ? 'mb-0.5' : 'mb-1';
  const compactSummaryClassName = isSmall ? 'mt-0.5 max-w-18' : isMedium ? 'mt-0.5' : 'mt-1';
  const formatCardTemperature = (value?: number, sourceUnit?: unknown) =>
    formatWeatherTemperature(value, sourceUnit, temperatureUnit);
  const textPrimary = weatherTextTreatment.primary;
  const textSecondary = weatherTextTreatment.secondary;
  const shellGlowOpacityClass =
    theme === 'black' ? 'opacity-18' : theme === 'dark' ? 'opacity-28' : 'opacity-55';
  const weatherOverlayClassName = hasCustomTint
    ? (tintSurface.overlayClassName ?? 'bg-transparent')
      : [surface.lightOverlay, shell.overlayClassName].filter(Boolean).join(' ');
  const sharedPanelClassName = getLunarWeatherPanelClassName(theme, true);

  const gradientBackgroundStyle = useMemo(
    () =>
      ({
        background:
          theme === 'light'
            ? 'radial-gradient(circle at 82% 8%, rgba(186,230,253,0.24), transparent 34%), radial-gradient(circle at 16% 100%, rgba(129,140,248,0.10), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.18), rgba(239,246,255,0.08) 48%, rgba(224,242,254,0.16) 100%)'
            : theme === 'glass'
              ? 'radial-gradient(circle at 82% 8%, rgba(125,211,252,0.14), transparent 34%), radial-gradient(circle at 16% 100%, rgba(129,140,248,0.10), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 38%, rgba(15,23,42,0.10) 100%)'
            : theme === 'black'
                ? 'radial-gradient(circle at 82% 8%, rgba(56,189,248,0.10), transparent 34%), radial-gradient(circle at 16% 100%, rgba(99,102,241,0.08), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01) 34%, rgba(0,0,0,0.16) 100%)'
                : 'radial-gradient(circle at 82% 8%, rgba(125,211,252,0.12), transparent 34%), radial-gradient(circle at 16% 100%, rgba(99,102,241,0.08), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02) 34%, rgba(2,6,23,0.16) 100%)',
      }) as React.CSSProperties,
    [theme]
  );

  const iconStylePrimary = useMemo(
    () => ({ color: textPrimary }) as React.CSSProperties,
    [textPrimary]
  );

  const iconStyleSecondary = useMemo(
    () => ({ color: textSecondary }) as React.CSSProperties,
    [textSecondary]
  );

  const titleStyle = useMemo(
    () =>
      ({
        color: textPrimary,
        textShadow: weatherTextTreatment.textShadow,
      }) as React.CSSProperties,
    [textPrimary, weatherTextTreatment.textShadow]
  );

  const subtitleStyle = useMemo(
    () =>
      ({
        color: textSecondary,
        textShadow: weatherTextTreatment.textShadow,
      }) as React.CSSProperties,
    [textSecondary, weatherTextTreatment.textShadow]
  );

  return (
    <>
      <CardWrapper
        className={`${cardShell.backdropClassName} ${weatherShellClassName} ${!isEditMode ? 'cursor-pointer' : ''}`}
        style={weatherTintStyle}
        lightOverlayClassName={weatherOverlayClassName || undefined}
        showShadow={false}
        interactionProps={interaction.cardProps}
      >
        <WeatherBackground
          condition={current?.condition ?? condition}
          effectsQuality={effectiveEffectsQuality}
          hasCustomTint={hasCustomTint}
          size={size}
          theme={theme}
        />

        {hasCustomTint ? (
          tintSurface.glowStyle ? (
            <div className="absolute inset-0" style={tintSurface.glowStyle} />
          ) : null
        ) : (
          <div className={`absolute inset-0 ${shell.glowClassName} ${shellGlowOpacityClass}`} />
        )}
        {!hasCustomTint ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={gradientBackgroundStyle}
          />
        ) : null}
        {!hasCustomTint ? (
          <WeatherAtmosphere
            condition={current?.condition ?? condition}
            effectsQuality={effectiveEffectsQuality}
            size={size}
            theme={theme}
          />
        ) : null}

        <div
          className={`relative z-2 flex h-full min-h-0 flex-col ${cardContentPaddingClassName}`}
          data-weather-card="v1"
          data-weather-model="true"
          data-weather-forecast-hourly={model?.forecast.hourly.length ?? 0}
          data-weather-forecast-daily={model?.forecast.daily.length ?? 0}
          data-weather-forecast-twice-daily={model?.forecast.twiceDaily.length ?? 0}
        >
          <div className={`${LUNAR_WEATHER_CARD_TOKENS.header} items-start justify-between ${compactHeaderClassName}`}>
            <div className="min-w-0">
              {!isTiny ? (
                <div className={`${LUNAR_WEATHER_CARD_TOKENS.headerEyebrow} mb-1`} style={subtitleStyle}>
                  {locale.toLowerCase().startsWith('zh') ? '天气' : 'Weather'}
                </div>
              ) : null}
              {!isTiny ? <div className={`inline-flex min-w-0 items-center ${compactLocationRowClassName}`}>
                <Navigation
                  className={`${isMedium || isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`}
                  style={iconStyleSecondary}
                />
                <div
                  className={`truncate ${isMedium || isSmall ? compactLocationTextClassName : 'text-base'} font-semibold leading-none tracking-[-0.03em]`}
                  style={titleStyle}
                >
                  {cardTitle}
                </div>
              </div> : null}

              {!isTiny ? (
                <div className={compactTemperatureBlockClassName}>
                  <div
                    className={`font-bold leading-none ${compactTemperatureTextClassName} ${compactTemperatureClassName}`}
                    style={titleStyle}
                  >
                    {formatCardTemperature(resolvedTemperature, resolvedTemperatureUnit)}
                  </div>
                  <div className={compactMetaTextClassName} style={subtitleStyle}>
                    {highTemp !== undefined ? `H:${formatCardTemperature(highTemp, highTempUnit)}` : null}
                    {highTemp !== undefined && lowTemp !== undefined ? ' ' : null}
                    {lowTemp !== undefined ? `L:${formatCardTemperature(lowTemp, lowTempUnit)}` : null}
                    {typeof resolvedFeelsLike === 'number'
                      ? ` · ${t('weather.feelsLikeShort', {
                          temp: formatCardTemperature(
                            resolvedFeelsLike,
                            resolvedFeelsLikeUnit
                          ),
                        })}`
                      : ''}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-2xl font-semibold leading-none" style={titleStyle}>
                  {resolvedTemperature !== undefined
                    ? formatCardTemperature(resolvedTemperature, resolvedTemperatureUnit)
                    : null}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <WeatherIcon
                condition={current?.condition ?? condition}
                className={`${isMedium || isSmall ? compactHeaderIconClassName : headerIconClassName} ml-auto shrink-0`}
                style={iconStylePrimary}
                isNight={current?.isDay === false}
                animated={!isTiny && !isExtraSmall}
                theme={theme}
              />
              {!isTiny ? <div
                className={`${compactSummaryClassName} ${compactSummaryTextClassName} font-medium leading-tight`}
                style={subtitleStyle}
              >
                {summaryLabel}
              </div> : null}
            </div>
          </div>

          {isTiny ? null : isExtraSmall ? (
            <div className="mt-auto flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm font-medium" style={subtitleStyle}>{summaryLabel}</div>
              <div className="text-right text-xs" style={subtitleStyle}>
                {highTemp !== undefined ? `H:${formatCardTemperature(highTemp, highTempUnit)} ` : null}
                {lowTemp !== undefined ? `L:${formatCardTemperature(lowTemp, lowTempUnit)}` : null}
              </div>
            </div>
          ) : isSmall || isMedium ? (
            <div className="flex h-full flex-col">
              {visibleForecast.length > 0 ? (
                <div className="mt-auto">
                  <WeatherForecastRow
                    forecast={visibleForecast}
                    temperatureUnit={temperatureUnit}
                    defaultTemperatureUnit={sourceTemperatureUnit}
                    showHourlyForecast={showHourlyForecast}
                    isSmall={isSmall}
                    isMedium={isMedium}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    textShadow={weatherTextTreatment.textShadow}
                    titleStyle={titleStyle}
                    subtitleStyle={subtitleStyle}
                    theme={theme}
                  />
                </div>
              ) : null}
            </div>
          ) : size === 'medium-vertical' ? (
            <div className="mt-auto flex min-h-0 flex-col gap-2">
              <div className={sharedPanelClassName}>
                <WeatherDetails
                temperature={resolvedTemperature}
                temperatureUnit={resolvedTemperatureUnit}
                highTemp={highTemp}
                highTempUnit={highTempUnit}
                lowTemp={lowTemp}
                lowTempUnit={lowTempUnit}
                feelsLikeTemperature={resolvedFeelsLike}
                feelsLikeTemperatureUnit={resolvedFeelsLikeUnit}
                displayTemperatureUnit={temperatureUnit}
                rainForecast={rainForecast}
                precipitation={resolvedPrecipitation}
                precipitationUnit={resolvedPrecipitationUnit}
                humidity={resolvedHumidity}
                windSpeed={resolvedWindSpeed}
                windSpeedUnit={resolvedWindUnit}
                windGustSpeed={resolvedWindGust}
                pressure={resolvedPressure}
                pressureUnit={resolvedPressureUnit}
                uvIndex={resolvedUvIndex}
                cloudCoverage={resolvedCloudCoverage}
                selectedMetricIds={selectedMetricIds.slice(0, 2)}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                textShadow={weatherTextTreatment.textShadow}
                titleStyle={titleStyle}
                subtitleStyle={subtitleStyle}
                />
              </div>
              {visibleForecast.length > 0 ? <WeatherForecastRow
                forecast={visibleForecast.slice(0, 4)}
                temperatureUnit={temperatureUnit}
                defaultTemperatureUnit={sourceTemperatureUnit}
                showHourlyForecast={showHourlyForecast}
                isSmall
                isMedium={false}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                textShadow={weatherTextTreatment.textShadow}
                titleStyle={titleStyle}
                subtitleStyle={subtitleStyle}
                theme={theme}
              /> : null}
            </div>
          ) : (
            <div className="mt-auto flex min-h-0 flex-col gap-2">
              <div className={`${sharedPanelClassName} flex items-end justify-between gap-4`}>
                <WeatherDetails
                  temperature={resolvedTemperature}
                  temperatureUnit={resolvedTemperatureUnit}
                  highTemp={highTemp}
                  highTempUnit={highTempUnit}
                  lowTemp={lowTemp}
                  lowTempUnit={lowTempUnit}
                  feelsLikeTemperature={resolvedFeelsLike}
                  feelsLikeTemperatureUnit={resolvedFeelsLikeUnit}
                  displayTemperatureUnit={temperatureUnit}
                  rainForecast={rainForecast}
                  precipitation={resolvedPrecipitation}
                  precipitationUnit={resolvedPrecipitationUnit}
                  humidity={resolvedHumidity}
                  windSpeed={resolvedWindSpeed}
                  windSpeedUnit={resolvedWindUnit}
                  windGustSpeed={resolvedWindGust}
                  pressure={resolvedPressure}
                  pressureUnit={resolvedPressureUnit}
                  uvIndex={resolvedUvIndex}
                  cloudCoverage={resolvedCloudCoverage}
                  showTemperatureSummary={false}
                  selectedMetricIds={selectedMetricIds}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textShadow={weatherTextTreatment.textShadow}
                  titleStyle={titleStyle}
                  subtitleStyle={subtitleStyle}
                />
              </div>

              <div className={sharedPanelClassName}>
                <WeatherSunTimes
                  sunrise={sunrise}
                  sunset={sunset}
                  daylight={daylight}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  textShadow={weatherTextTreatment.textShadow}
                  titleStyle={titleStyle}
                  subtitleStyle={subtitleStyle}
                  iconStyleSecondary={iconStyleSecondary}
                />
              </div>

              {(size === 'extra-large' || size === 'extra-wide') && model ? (
                <WeatherChart
                  forecast={model.forecast.hourly.slice(0, size === 'extra-wide' ? 24 : 12)}
                  theme={theme}
                  sourceTemperatureUnit={resolvedTemperatureUnit}
                  displayTemperatureUnit={temperatureUnit}
                />
              ) : null}

              {visibleForecast.length > 0 && (
                <div className="flex justify-between gap-2">
                  <WeatherForecastRow
                    forecast={visibleForecast}
                    temperatureUnit={temperatureUnit}
                    defaultTemperatureUnit={sourceTemperatureUnit}
                    showHourlyForecast={showHourlyForecast}
                    isSmall={false}
                    isMedium={false}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    textShadow={weatherTextTreatment.textShadow}
                    titleStyle={titleStyle}
                    subtitleStyle={subtitleStyle}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardWrapper>

      {isSettingsOpen ? (
        <WeatherSettingsDialog
          entityId={id}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          theme={theme}
          accentColorValue={accentColor}
          title={cityName}
          forecastMode={selectedForecastMode}
          onForecastModeChange={(mode) => updateSettings({ weatherForecastMode: mode })}
          metricIds={selectedMetricIds}
          onMetricIdsChange={(metricIds) => updateSettings({ weatherMetricIds: metricIds })}
          availableMetricIds={[
            ...(typeof resolvedPrecipitation === 'number' ? (['precipitation'] as const) : []),
            ...(typeof resolvedHumidity === 'number' ? (['humidity'] as const) : []),
            ...(typeof resolvedWindSpeed === 'number' ? (['wind'] as const) : []),
            ...(typeof resolvedFeelsLike === 'number' ? (['feelsLike'] as const) : []),
            ...(typeof resolvedWindGust === 'number' ? (['windGust'] as const) : []),
            ...(typeof resolvedPressure === 'number' ? (['pressure'] as const) : []),
            ...(typeof resolvedUvIndex === 'number' ? (['uvIndex'] as const) : []),
            ...(typeof resolvedCloudCoverage === 'number' ? (['cloudCover'] as const) : []),
          ]}
          tintColor={tintColor}
          onTintColorChange={setTintColor}
        />
      ) : null}
      {isExpanded && model ? (
        <WeatherCenter model={model} title={cardTitle} theme={theme} locale={locale} onClose={() => setIsExpanded(false)} />
      ) : null}
    </>
  );
});
