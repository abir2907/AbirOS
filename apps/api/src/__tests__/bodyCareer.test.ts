import { describe, it, expect } from 'vitest';
import { computeOutOfRange } from '../modules/life/health.js';
import { mapSolvedCounts } from '../modules/developer/leetcode.js';

describe('computeOutOfRange', () => {
  it('flags below low and above high', () => {
    expect(computeOutOfRange(12, 13, 17)).toBe(true);
    expect(computeOutOfRange(18, 13, 17)).toBe(true);
  });
  it('passes values within range', () => {
    expect(computeOutOfRange(14, 13, 17)).toBe(false);
  });
  it('handles missing bounds', () => {
    expect(computeOutOfRange(100)).toBe(false);
    expect(computeOutOfRange(5, 10)).toBe(true); // below low only
    expect(computeOutOfRange(5, null, 3)).toBe(true); // above high only
  });
});

describe('mapSolvedCounts', () => {
  it('maps LeetCode acSubmissionNum to counts', () => {
    const out = mapSolvedCounts([
      { difficulty: 'All', count: 120 },
      { difficulty: 'Easy', count: 60 },
      { difficulty: 'Medium', count: 50 },
      { difficulty: 'Hard', count: 10 },
    ]);
    expect(out).toEqual({ total: 120, easy: 60, medium: 50, hard: 10 });
  });
  it('defaults to zeros for missing/undefined', () => {
    expect(mapSolvedCounts(undefined)).toEqual({ total: 0, easy: 0, medium: 0, hard: 0 });
  });
});
