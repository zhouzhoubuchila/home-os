import {
  formatTemperatureFromSourceUnit,
  formatTemperatureValueFromSourceUnit,
  getTemperatureUnitSymbol,
  normalizeTemperatureUnit,
  type TemperatureUnit,
} from '@navet/app/utils/temperature';

export function resolveWeatherTemperatureUnit(value: unknown): TemperatureUnit | undefined {
  return normalizeTemperatureUnit(value);
}

export function formatWeatherTemperature(
  value: number | undefined,
  sourceUnit: unknown,
  displayUnit: TemperatureUnit
): string {
  if (value === undefined) return '';
  const normalizedSourceUnit = resolveWeatherTemperatureUnit(sourceUnit);
  return formatTemperatureFromSourceUnit(value, normalizedSourceUnit, displayUnit).replace('°', ' °');
}

export function formatWeatherTemperatureValue(
  value: number | undefined,
  sourceUnit: unknown,
  displayUnit: TemperatureUnit
): string {
  if (value === undefined) return '';
  const normalizedSourceUnit = resolveWeatherTemperatureUnit(sourceUnit);
  return `${formatTemperatureValueFromSourceUnit(value, normalizedSourceUnit, displayUnit)} ${getTemperatureUnitSymbol(displayUnit)}`;
}
