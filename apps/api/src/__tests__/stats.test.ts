import { describe, it, expect } from 'vitest';
import {
  mean,
  stddev,
  linearRegression,
  forecast,
  movingAverage,
  detectAnomalies,
  detectRecurring,
} from '../modules/life/stats.js';

describe('life stats', () => {
  it('mean and stddev', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(stddev([4, 4, 4])).toBe(0);
    expect(stddev([2, 4, 6])).toBeCloseTo(1.633, 2);
  });

  it('linearRegression recovers a known line', () => {
    const { slope, intercept } = linearRegression([1, 3, 5, 7]); // y = 2x + 1
    expect(slope).toBeCloseTo(2, 5);
    expect(intercept).toBeCloseTo(1, 5);
  });

  it('forecast continues the trend', () => {
    const next = forecast([1, 3, 5, 7], 2); // expect 9, 11
    expect(next[0]).toBeCloseTo(9, 5);
    expect(next[1]).toBeCloseTo(11, 5);
  });

  it('movingAverage smooths', () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
  });

  it('detectAnomalies flags an outlier', () => {
    const idx = detectAnomalies([10, 10, 10, 10, 100], 1.5);
    expect(idx).toContain(4);
  });

  it('detectRecurring finds a monthly subscription', () => {
    const charges = [
      { merchant: 'Netflix', amount: 15.99, spentOn: '2026-01-01' },
      { merchant: 'Netflix', amount: 15.99, spentOn: '2026-02-01' },
      { merchant: 'Netflix', amount: 15.99, spentOn: '2026-03-01' },
      { merchant: 'Corner Shop', amount: 4.2, spentOn: '2026-01-05' },
    ];
    const found = detectRecurring(charges);
    expect(found).toHaveLength(1);
    expect(found[0]!.merchant).toBe('netflix');
    expect(found[0]!.cadence).toBe('monthly');
    expect(found[0]!.count).toBe(3);
  });
});
