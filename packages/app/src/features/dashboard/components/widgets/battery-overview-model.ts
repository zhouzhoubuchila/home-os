import { BATTERY_LEVEL_THRESHOLDS } from './battery-constants';

export interface BatteryOverviewRow {
  id: string;
  name: string;
  level: number;
}

export interface BatteryOverviewModel {
  rows: BatteryOverviewRow[];
  totalCount: number;
  averageLevel?: number;
  lowest?: BatteryOverviewRow;
  criticalCount: number;
  lowCount: number;
  normalCount: number;
}

function normalizeLevel(level: number) {
  return Number.isFinite(level) ? Math.max(0, Math.min(100, Math.round(level))) : undefined;
}

export function buildBatteryOverviewModel(
  rows: readonly BatteryOverviewRow[]
): BatteryOverviewModel {
  const normalizedRows = rows
    .flatMap((row) => {
      const level = normalizeLevel(row.level);
      return level === undefined ? [] : [{ ...row, level }];
    })
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));
  const totalCount = normalizedRows.length;
  const criticalCount = normalizedRows.filter(
    (row) => row.level <= BATTERY_LEVEL_THRESHOLDS.CRITICAL
  ).length;
  const lowCount = normalizedRows.filter(
    (row) =>
      row.level > BATTERY_LEVEL_THRESHOLDS.CRITICAL && row.level <= BATTERY_LEVEL_THRESHOLDS.LOW
  ).length;
  const normalCount = normalizedRows.filter(
    (row) => row.level > BATTERY_LEVEL_THRESHOLDS.LOW
  ).length;
  const averageLevel =
    totalCount > 0
      ? Math.round(normalizedRows.reduce((sum, row) => sum + row.level, 0) / totalCount)
      : undefined;

  return {
    rows: normalizedRows,
    totalCount,
    averageLevel,
    lowest: normalizedRows[0],
    criticalCount,
    lowCount,
    normalCount,
  };
}
