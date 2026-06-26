import { describe, it, expect } from 'vitest';
import { reciprocalRankFusion } from '../rrf.js';

describe('reciprocalRankFusion', () => {
  it('ranks an item appearing high in multiple lists first', () => {
    const semantic = ['a', 'b', 'c'];
    const fulltext = ['b', 'a', 'd'];
    const fused = reciprocalRankFusion([semantic, fulltext]);
    // 'a' (ranks 0,1) and 'b' (ranks 1,0) both appear in both lists and beat singletons.
    expect(fused[0]!.id === 'a' || fused[0]!.id === 'b').toBe(true);
    expect(fused.map((f) => f.id)).toContain('d');
    expect(fused.map((f) => f.id)).toContain('c');
  });

  it('a consensus top item outranks items found in only one list', () => {
    const fused = reciprocalRankFusion([
      ['x', 'y', 'z'],
      ['x', 'p', 'q'],
    ]);
    expect(fused[0]!.id).toBe('x'); // top of both lists
  });

  it('scores descend', () => {
    const fused = reciprocalRankFusion([['a', 'b', 'c']]);
    for (let i = 1; i < fused.length; i++) {
      expect(fused[i - 1]!.score).toBeGreaterThanOrEqual(fused[i]!.score);
    }
  });

  it('handles empty input', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
  });
});
