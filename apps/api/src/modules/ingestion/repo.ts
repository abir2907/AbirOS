import { and, eq, isNull } from 'drizzle-orm';
import {
  getDb,
  source,
  document,
  chunk,
  embedding,
  note,
  jobRun,
  type NewSource,
} from '@abiros/db';
import type { TextChunk } from '@abiros/ai';

export async function findReadyByHash(hash: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(source)
    .where(and(eq(source.hash, hash), eq(source.status, 'ready'), isNull(source.deletedAt)))
    .limit(1);
  return rows[0];
}

export async function createSource(values: NewSource) {
  const db = getDb();
  const [row] = await db.insert(source).values(values).returning();
  return row!;
}

export async function createNote(sourceId: string, title: string, contentMarkdown: string) {
  const db = getDb();
  await db.insert(note).values({ sourceId, title, contentMarkdown });
}

export async function getSource(id: string) {
  const db = getDb();
  const rows = await db.select().from(source).where(eq(source.id, id)).limit(1);
  return rows[0];
}

export async function getDocumentBySource(sourceId: string) {
  const db = getDb();
  const rows = await db.select().from(document).where(eq(document.sourceId, sourceId)).limit(1);
  return rows[0];
}

export async function upsertDocument(
  sourceId: string,
  text: string,
  title?: string,
  metadata: Record<string, unknown> = {},
) {
  const db = getDb();
  const existing = await getDocumentBySource(sourceId);
  if (existing) {
    const [row] = await db
      .update(document)
      .set({ text, title, metadata, updatedAt: new Date() })
      .where(eq(document.id, existing.id))
      .returning();
    return row!;
  }
  const [row] = await db.insert(document).values({ sourceId, text, title, metadata }).returning();
  return row!;
}

export async function setStatus(
  id: string,
  status: 'pending' | 'processing' | 'ready' | 'failed',
  opts: { error?: string | null; ingestedAt?: Date } = {},
) {
  const db = getDb();
  await db
    .update(source)
    .set({ status, error: opts.error ?? null, ingestedAt: opts.ingestedAt, updatedAt: new Date() })
    .where(eq(source.id, id));
}

/** Insert chunk rows + their embeddings in one transaction. */
export async function insertChunksWithEmbeddings(
  documentId: string,
  sourceId: string,
  chunks: TextChunk[],
  vectors: number[][],
  model: string,
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    // Replace any prior chunks for idempotent re-ingestion.
    await tx.delete(chunk).where(eq(chunk.sourceId, sourceId));
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      const [row] = await tx
        .insert(chunk)
        .values({ documentId, sourceId, ord: c.ord, text: c.text, tokenCount: c.tokenCount })
        .returning({ id: chunk.id });
      await tx.insert(embedding).values({ chunkId: row!.id, embedding: vectors[i]!, model });
    }
  });
}

export async function recordJob(
  jobName: string,
  sourceId: string,
  status: 'running' | 'done' | 'failed',
  opts: { error?: string; metadata?: Record<string, unknown>; finishedAt?: Date } = {},
) {
  const db = getDb();
  await db.insert(jobRun).values({
    jobName,
    sourceId,
    status,
    error: opts.error,
    finishedAt: opts.finishedAt,
    metadata: opts.metadata ?? {},
  });
}
