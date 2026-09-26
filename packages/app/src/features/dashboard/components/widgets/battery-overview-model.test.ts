import { describe, expect, it } from 'vitest';
import { buildBatteryOverviewModel } from './battery-overview-model';

const rows = [
  { id: 'critical', name: 'Critical', level: 20 },
  { id: 'low', name: 'Low', level: 40 },
  { id: 'normal', name: 'Normal', level: 41 },
  { id: 'full', name: 'Full', level: 100 },
];

describe('buildBatteryOverviewModel', () => {
  it('keeps thresholds and sorts the lowest battery first', () => {
    const model = buildBatteryOverviewModel(rows);

    expect(model.rows.map((row) => row.id)).toEqual(['critical', 'low', 'normal', 'full']);
    expect(model.criticalCount).toBe(1);
    expect(model.lowCount).toBe(1);
    expect(model.normalCount).toBe(2);
    expect(model.lowest).toMatchObject({ id: 'critical', level: 20 });
  });

  it.each([
    [0, 0],
    [20, 20],
    [50, 50],
    [100, 100],
  ])('calculates an average of %i as %i', (level, expected) => {
    expect(buildBatteryOverviewModel([{ id: 'one', name: 'One', level }]).averageLevel).toBe(
      expected
    );
  });

  it('keeps 21% low and 41% above the low threshold', () => {
    const model = buildBatteryOverviewModel([
      { id: 'low', name: 'Low', level: 21 },
      { id: 'normal', name: 'Normal', level: 41 },
    ]);
    expect(model.lowCount).toBe(1);
    expect(model.normalCount).toBe(1);
    expect(model.averageLevel).toBe(31);
  });

  it('ignores non-finite levels and leaves an empty average undefined', () => {
    expect(
      buildBatteryOverviewModel([{ id: 'bad', name: 'Bad', level: Number.NaN }])
    ).toMatchObject({
      rows: [],
      totalCount: 0,
      averageLevel: undefined,
    });
  });
});
