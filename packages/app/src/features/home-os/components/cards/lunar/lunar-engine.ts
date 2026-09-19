import { getMoonData, getMoonIllumination, getMoonPosition, getMoonTimes } from '@noim/suncalc3';

export interface LunarLocation {
  latitude: number;
  longitude: number;
}

export interface LunarSnapshot {
  phase: number;
  illumination: number;
  ageDays: number;
  azimuth: number;
  altitude: number;
  distanceKm: number;
  rise?: Date;
  set?: Date;
  highest?: Date;
  nextFullMoon?: Date;
  nextNewMoon?: Date;
}

export interface HorizonPoint {
  time: Date;
  altitude: number;
  azimuth: number;
}

function validDate(value: Date | number | undefined) {
  if (value === undefined) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** React/Home OS port of upstream Moon model calculations. */
export function calculateLunarSnapshot(
  date: Date,
  location?: LunarLocation
): LunarSnapshot | undefined {
  if (!location) return undefined;
  const data = getMoonData(date, location.latitude, location.longitude);
  const times = getMoonTimes(date, location.latitude, location.longitude);
  return {
    phase: data.illumination.phaseValue,
    illumination: data.illumination.fraction,
    ageDays: data.illumination.phaseValue * 29.530588853,
    azimuth: data.azimuthDegrees,
    altitude: data.altitudeDegrees,
    distanceKm: data.distance,
    rise: validDate(times.rise),
    set: validDate(times.set),
    highest: validDate(times.highest),
    nextFullMoon: validDate(data.illumination.next.fullMoon.value),
    nextNewMoon: validDate(data.illumination.next.newMoon.value),
  };
}

export function calculatePhase(date: Date) {
  const illumination = getMoonIllumination(date);
  return {
    phase: illumination.phaseValue,
    illumination: illumination.fraction,
  };
}

/** Mirrors upstream's 24-hour dynamic chart window and five-minute sampling. */
export function buildHorizonSeries(date: Date, location: LunarLocation): HorizonPoint[] {
  const start = new Date(date);
  start.setHours(start.getHours() - 6);
  const points: HorizonPoint[] = [];
  for (let minute = 0; minute < 24 * 60; minute += 5) {
    const time = new Date(start.getTime() + minute * 60_000);
    const position = getMoonPosition(time, location.latitude, location.longitude);
    points.push({
      time,
      altitude: Number(position.altitudeDegrees.toFixed(2)),
      azimuth: Number(position.azimuthDegrees.toFixed(2)),
    });
  }
  return points;
}

export function getMoonEvents(date: Date, location: LunarLocation) {
  const times = getMoonTimes(date, location.latitude, location.longitude);
  return {
    rise: validDate(times.rise),
    set: validDate(times.set),
    highest: validDate(times.highest),
  };
}
