/**
 * Lightweight retrieval reranker. After hybrid search fuses semantic + full-text
 * results (RRF), this re-scores the candidates with cheap, explainable signals —
 * keyword overlap with the query and recency — so the most on-topic and freshest
 * snippets rise to the top. Pure and unit-tested; a cross-encoder model could
 * replace it later behind the same interface.
 */
export interface Rerankable {
  /** Fused RRF score from hybrid search. */
  rrf: number;
  text: string;
  /** Age of the source in days (optional; omitted → treated as neutral). */
  ageDays?: number;
}

const W_RRF = 0.6;
const W_OVERLAP = 0.3;
const W_RECENCY = 0.1;
const RECENCY_HALFLIFE_DAYS = 90;

export function rerank<T extends Rerankable>(query: string, items: T[]): (T & { score: number })[] {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  const maxRrf = Math.max(...items.map((i) => i.rrf), 1e-9);

  return items
    .map((item) => {
      const text = item.text.toLowerCase();
      const overlap = terms.length
        ? terms.filter((t) => text.includes(t)).length / terms.length
        : 0;
      const recency =
        item.ageDays != null ? Math.exp(-Math.max(0, item.ageDays) / RECENCY_HALFLIFE_DAYS) : 0.5;
      const score = W_RRF * (item.rrf / maxRrf) + W_OVERLAP * overlap + W_RECENCY * recency;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);
}
