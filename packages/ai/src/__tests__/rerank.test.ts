import { describe, it, expect } from 'vitest';
import { rerank } from '../rerank.js';

describe('rerank', () => {
  it('boosts items whose text overlaps the query terms', () => {
    const items = [
      { id: 'a', rrf: 0.5, text: 'the cat sat on the mat' },
      { id: 'b', rrf: 0.5, text: 'authentication uses a json web token' },
    ];
    const out = rerank('how does authentication work', items);
    expect(out[0]!.id).toBe('b');
  });

  it('prefers fresher items when overlap is equal', () => {
    const items = [
      { id: 'old', rrf: 0.5, text: 'identical text', ageDays: 365 },
      { id: 'new', rrf: 0.5, text: 'identical text', ageDays: 1 },
    ];
    const out = rerank('identical', items);
    expect(out[0]!.id).toBe('new');
  });

  it('keeps a strong RRF score influential', () => {
    const items = [
      { id: 'top', rrf: 1.0, text: 'unrelated' },
      { id: 'low', rrf: 0.01, text: 'unrelated' },
    ];
    const out = rerank('something else', items);
    expect(out[0]!.id).toBe('top');
  });

  it('handles empty input', () => {
    expect(rerank('x', [])).toEqual([]);
  });
});
