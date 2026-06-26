/**
 * Reciprocal Rank Fusion — combines several ranked result lists (e.g. semantic
 * vs. full-text) into one ranking without needing comparable scores. Each list
 * contributes 1/(k + rank) to an item's fused score.
 *
 * Reference: Cormack et al., "Reciprocal Rank Fusion outperforms Condorcet…".
 */
export interface FusedResult<T> {
  id: T;
  score: number;
}

export function reciprocalRankFusion<T>(
  rankedLists: T[][],
  k = 60,
): FusedResult<T>[] {
  const scores = new Map<T, number>();
  for (const list of rankedLists) {
    list.forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
