/**
 * Sentence-aware text chunking for retrieval.
 *
 * Splits text into ~`targetTokens` chunks with ~`overlapTokens` of carry-over
 * between neighbours, never cutting mid-sentence (unless a single sentence is
 * itself larger than the target, in which case it is hard-split on word
 * boundaries). Token counts are estimated (~4 chars/token) — good enough for
 * sizing; the embedding model does the real tokenization.
 */
export interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

export interface TextChunk {
  ord: number;
  text: string;
  tokenCount: number;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Hard-split a single oversized sentence on word boundaries. */
function splitLongSentence(sentence: string, targetTokens: number): string[] {
  const words = sentence.split(/\s+/);
  const out: string[] = [];
  let buf: string[] = [];
  for (const w of words) {
    buf.push(w);
    if (estimateTokens(buf.join(' ')) >= targetTokens) {
      out.push(buf.join(' '));
      buf = [];
    }
  }
  if (buf.length) out.push(buf.join(' '));
  return out;
}

export function chunkText(text: string, opts: ChunkOptions = {}): TextChunk[] {
  const targetTokens = opts.targetTokens ?? 600;
  const overlapTokens = opts.overlapTokens ?? 80;

  const clean = text.trim();
  if (!clean) return [];

  // Expand oversized sentences first so a unit never exceeds ~1.5x target.
  const units: string[] = [];
  for (const s of splitSentences(clean)) {
    if (estimateTokens(s) > targetTokens * 1.5) units.push(...splitLongSentence(s, targetTokens));
    else units.push(s);
  }

  const chunks: TextChunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    const body = current.join(' ');
    chunks.push({ ord: chunks.length, text: body, tokenCount: estimateTokens(body) });
  };

  for (const unit of units) {
    const unitTokens = estimateTokens(unit);
    if (currentTokens + unitTokens > targetTokens && current.length > 0) {
      flush();
      // Build overlap: keep trailing sentences up to ~overlapTokens.
      const carry: string[] = [];
      let carryTokens = 0;
      for (let i = current.length - 1; i >= 0 && carryTokens < overlapTokens; i--) {
        carry.unshift(current[i]!);
        carryTokens += estimateTokens(current[i]!);
      }
      current = carry;
      currentTokens = carryTokens;
    }
    current.push(unit);
    currentTokens += unitTokens;
  }
  flush();

  // Re-number ord sequentially (flush used chunks.length which is correct).
  return chunks.map((c, i) => ({ ...c, ord: i }));
}
