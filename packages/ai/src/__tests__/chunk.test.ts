import { describe, it, expect } from 'vitest';
import { chunkText, estimateTokens } from '../chunk.js';

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('Hello world. This is a small note.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.ord).toBe(0);
    expect(chunks[0]!.text).toContain('Hello world');
  });

  it('splits long text into multiple ordered chunks with overlap', () => {
    // Distinct sentences so overlap is verifiable.
    const sentences = Array.from(
      { length: 120 },
      (_, i) => `This is sentence number ${i} containing several filler words to add length.`,
    );
    const chunks = chunkText(sentences.join(' '), { targetTokens: 120, overlapTokens: 40 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => expect(c.ord).toBe(i));
    // Every chunk is within a sane size envelope of the target.
    chunks.forEach((c) => expect(c.tokenCount).toBeLessThanOrEqual(120 * 1.6));

    // The last sentence of one chunk should carry over into the next (overlap).
    const idx = chunks[0]!.text.lastIndexOf('This is sentence number');
    const lastSentence = chunks[0]!.text.slice(idx).split('.')[0]!;
    expect(chunks[1]!.text).toContain(lastSentence);
  });

  it('hard-splits a single oversized sentence', () => {
    const giant = 'word '.repeat(2000); // no sentence boundaries
    const chunks = chunkText(giant, { targetTokens: 100 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('estimateTokens scales with length', () => {
    expect(estimateTokens('a')).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});
