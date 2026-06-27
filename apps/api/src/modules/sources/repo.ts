import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb, source, document, chunk } from '@abiros/db';
import type { SourceSummary } from '@abiros/shared';
import { getTagsForSource } from '../tags/repo.js';

function toSummary(r: typeof source.$inferSelect): SourceSummary {
  return {
    id: r.id,
    type: r.type as SourceSummary['type'],
    title: r.title,
    uri: r.uri,
    status: r.status as SourceSummary['status'],
    error: r.error,
    projectId: r.projectId ?? null,
    createdAt: r.createdAt.toISOString(),
    ingestedAt: r.ingestedAt ? r.ingestedAt.toISOString() : null,
  };
}

export async function listSources(limit: number, offset: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(source)
    .where(isNull(source.deletedAt))
    .orderBy(desc(source.createdAt))
    .limit(limit)
    .offset(offset);
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(source)
    .where(isNull(source.deletedAt));
  return { items: rows.map(toSummary), total: countRows[0]?.count ?? 0, limit, offset };
}

export async function getSourceDetail(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(source)
    .where(and(eq(source.id, id), isNull(source.deletedAt)))
    .limit(1);
  const src = rows[0];
  if (!src) return undefined;

  const [doc] = await db
    .select({ text: document.text })
    .from(document)
    .where(eq(document.sourceId, id))
    .limit(1);
  const chunkRows = await db
    .select({ chunks: sql<number>`count(*)::int` })
    .from(chunk)
    .where(eq(chunk.sourceId, id));

  const tags = await getTagsForSource(id);

  return {
    ...toSummary(src),
    metadata: src.metadata,
    chunkCount: chunkRows[0]?.chunks ?? 0,
    preview: doc?.text ? doc.text.slice(0, 2000) : null,
    tags,
  };
}

export async function softDeleteSource(id: string): Promise<boolean> {
  const db = getDb();
  const res = await db
    .update(source)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(source.id, id), isNull(source.deletedAt)))
    .returning({ id: source.id });
  return res.length > 0;
}
