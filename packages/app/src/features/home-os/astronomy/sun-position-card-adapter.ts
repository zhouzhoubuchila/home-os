/*
 * Adapted from Sun Position Card at commit 730a1e145e064a0ccc885c795f74c81d61859a28.
 * Copyright (c) 2025/2026 jayjojayson. Licensed under the MIT License.
 * The complete notice is retained in /THIRD_PARTY_NOTICES.md.
 */

const DAY_MS = 86_400_000;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export interface SunArcPoint {
  progress: number;
  x: number;
  y: number;
}

export function calculateSunArcPosition(
  now: Date,
  nextRising: Date,
  nextSetting: Date,
  isDay: boolean
): SunArcPoint | undefined {
  if (!isDay) return undefined;
  const rise = nextRising > now ? new Date(nextRising.getTime() - DAY_MS) : nextRising;
  const totalDay = nextSetting.getTime() - rise.getTime();
  if (totalDay <= 0) return undefined;
  const progress = clamp((now.getTime() - rise.getTime()) / totalDay);
  const radians = Math.PI * (1 - progress);
  return {
    progress,
    x: 100 + Math.cos(radians) * 82,
    y: 82 - Math.sin(radians) * 58,
  };
}

export function calculateNightArcPosition(
  now: Date,
  nextRising: Date,
  nextSetting: Date,
  isDay: boolean
): SunArcPoint | undefined {
  if (isDay) return undefined;
  const daylight = nextSetting.getTime() - nextRising.getTime();
  const nightLength = DAY_MS - daylight;
  if (nightLength <= 0) return undefined;
  const nightStart = nextRising.getTime() - nightLength;
  const progress = clamp((now.getTime() - nightStart) / nightLength);
  const radians = Math.PI * (1 - progress);
  return {
    progress,
    x: 100 + Math.cos(radians) * 82,
    y: 82 - Math.sin(radians) * 58,
  };
}

export function calculateDaylightDuration(nextRising?: Date, nextSetting?: Date) {
  if (!nextRising || !nextSetting) return undefined;
  let duration = nextSetting.getTime() - nextRising.getTime();
  if (duration < 0) duration += DAY_MS;
  if (duration > DAY_MS) duration -= DAY_MS;
  return duration >= 0 ? duration : undefined;
}

/** Port of Sun Position Card's latitude-based daylight approximation. */
export function calculateAstronomicalDaylightDuration(date: Date, latitude?: number) {
  if (latitude === undefined || !Number.isFinite(latitude)) return undefined;
  const radians = Math.PI / 180;
  const yearStart = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (date.getTime() -
      yearStart.getTime() +
      (yearStart.getTimezoneOffset() - date.getTimezoneOffset()) * 60_000) /
      DAY_MS
  );
  const declination = Math.asin(
    Math.sin(23.44 * radians) * Math.sin(radians * (360 / 365.24) * (dayOfYear - 81))
  );
  const numerator =
    Math.sin(-0.833 * radians) - Math.sin(latitude * radians) * Math.sin(declination);
  const denominator = Math.cos(latitude * radians) * Math.cos(declination);
  const cosine = numerator / denominator;
  if (cosine < -1) return DAY_MS;
  if (cosine > 1) return 0;
  return ((Math.acos(cosine) * 180) / Math.PI) * (2 / 15) * 3_600_000;
}

export type SunDaypart =
  | 'below_horizon'
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'evening'
  | 'dusk';

export function resolveSunDaypart(azimuth?: number, elevation?: number): SunDaypart {
  if (elevation === undefined || elevation <= 0) return 'below_horizon';
  if (elevation < 5) return (azimuth ?? 0) < 200 ? 'dawn' : 'dusk';
  if ((azimuth ?? 0) < 155) return 'morning';
  if ((azimuth ?? 0) < 200) return 'noon';
  if ((azimuth ?? 0) < 255) return 'afternoon';
  return 'evening';
}
