import { getPool, toVectorLiteral } from '@abiros/db';
import type { SearchHit } from '@abiros/shared';

interface IdRow {
  chunk_id: string;
}

/** Semantic top-k via pgvector cosine distance (HNSW index). */
export async function vectorSearch(queryVec: number[], k: number): Promise<string[]> {
  const { rows } = await getPool().query<IdRow>(
    `SELECT c.id AS chunk_id
       FROM embedding e
       JOIN chunk c ON c.id = e.chunk_id
       JOIN source s ON s.id = c.source_id
      WHERE s.deleted_at IS NULL
      ORDER BY e.embedding <=> $1::vector
      LIMIT $2`,
    [toVectorLiteral(queryVec), k],
  );
  return rows.map((r) => r.chunk_id);
}

/** Lexical top-k via Postgres full-text search on the generated tsvector. */
export async function fulltextSearch(query: string, k: number): Promise<string[]> {
  const { rows } = await getPool().query<IdRow>(
    `SELECT c.id AS chunk_id
       FROM chunk c
       JOIN source s ON s.id = c.source_id
      WHERE s.deleted_at IS NULL
        AND c.tsv @@ websearch_to_tsquery('english', $1)
      ORDER BY ts_rank(c.tsv, websearch_to_tsquery('english', $1)) DESC
      LIMIT $2`,
    [query, k],
  );
  return rows.map((r) => r.chunk_id);
}

interface HitRow {
  chunk_id: string;
  source_id: string;
  source_title: string;
  source_type: SearchHit['sourceType'];
  text: string;
}

/** Fetch display info for a set of chunk ids (order not guaranteed). */
export async function hydrateChunks(chunkIds: string[]): Promise<Map<string, Omit<SearchHit, 'score'>>> {
  if (chunkIds.length === 0) return new Map();
  const { rows } = await getPool().query<HitRow>(
    `SELECT c.id AS chunk_id, c.text, c.source_id,
            s.title AS source_title, s.type AS source_type
       FROM chunk c
       JOIN source s ON s.id = c.source_id
      WHERE c.id = ANY($1::uuid[])`,
    [chunkIds],
  );
  const map = new Map<string, Omit<SearchHit, 'score'>>();
  for (const r of rows) {
    map.set(r.chunk_id, {
      chunkId: r.chunk_id,
      sourceId: r.source_id,
      sourceTitle: r.source_title,
      sourceType: r.source_type,
      text: r.text,
    });
  }
  return map;
}
