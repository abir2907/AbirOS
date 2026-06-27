import { and, eq, isNull } from 'drizzle-orm';
import { getDb, source } from '@abiros/db';
import { HttpError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { extractGraph } from './generate.js';
import * as repo from './repo.js';

export async function extractForSource(sourceId: string) {
  const text = await repo.getSourceText(sourceId);
  if (!text) throw HttpError.validation('That source has no extracted text yet.');
  const graph = await extractGraph(text);
  return repo.saveGraph(sourceId, graph);
}

/** Build the knowledge map across all ready sources (bounded). */
export async function extractAll() {
  const db = getDb();
  const rows = await db
    .select({ id: source.id })
    .from(source)
    .where(and(eq(source.status, 'ready'), isNull(source.deletedAt)))
    .limit(25);

  const total = { sources: 0, entities: 0, relations: 0 };
  for (const r of rows) {
    try {
      const res = await extractForSource(r.id);
      total.sources++;
      total.entities += res.entities;
      total.relations += res.relations;
    } catch (err) {
      logger.warn({ sourceId: r.id, err: err instanceof Error ? err.message : err }, 'graph extract failed');
    }
  }
  return total;
}
