import { reciprocalRankFusion } from '@abiros/ai';
import type { SearchHit } from '@abiros/shared';
import { logger } from '../../lib/logger.js';
import { getEmbedder } from '../../lib/ai.js';
import { vectorSearch, fulltextSearch, hydrateChunks } from './repo.js';

/**
 * Hybrid retrieval: pgvector semantic + Postgres full-text, fused with RRF.
 * This single function powers both the Search module and the chat's retrieval.
 * Degrades gracefully — if embeddings are unavailable (Ollama down), it falls
 * back to full-text only rather than failing.
 */
export async function hybridSearch(query: string, k = 8): Promise<SearchHit[]> {
  const pool = k * 3; // over-fetch per method before fusion

  let vectorIds: string[] = [];
  try {
    const [vec] = await getEmbedder().embed([query]);
    if (vec) vectorIds = await vectorSearch(vec, pool);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'vector search unavailable; using full-text only');
  }

  const ftsIds = await fulltextSearch(query, pool).catch((err) => {
    logger.warn({ err }, 'full-text search failed');
    return [] as string[];
  });

  const fused = reciprocalRankFusion([vectorIds, ftsIds]).slice(0, k);
  const details = await hydrateChunks(fused.map((f) => f.id));

  const hits: SearchHit[] = [];
  for (const f of fused) {
    const d = details.get(f.id);
    if (d) hits.push({ ...d, score: f.score });
  }
  return hits;
}
