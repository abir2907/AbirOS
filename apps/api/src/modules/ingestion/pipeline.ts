import { chunkText } from '@abiros/ai';
import { logger } from '../../lib/logger.js';
import { getEmbedder, EMBED_MODEL_NAME } from '../../lib/ai.js';
import { getStorage } from '../../lib/storage.js';
import { extractFromUrl, extractFromPdf } from '../../lib/parsers.js';
import * as repo from './repo.js';

const EMBED_BATCH = 16;

async function embedInBatches(texts: string[]): Promise<number[][]> {
  const embedder = getEmbedder();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    out.push(...(await embedder.embed(batch)));
  }
  return out;
}

/** Type-specific extraction → normalized document text. */
async function ensureDocument(src: NonNullable<Awaited<ReturnType<typeof repo.getSource>>>) {
  const existing = await repo.getDocumentBySource(src.id);
  if (existing) return existing;

  switch (src.type) {
    case 'web_article': {
      if (!src.uri) throw new Error('web_article source has no URI');
      const ex = await extractFromUrl(src.uri);
      return repo.upsertDocument(src.id, ex.text, ex.title ?? src.title, ex.metadata);
    }
    case 'pdf': {
      const key = (src.metadata as { storageKey?: string }).storageKey ?? src.hash;
      if (!key) throw new Error('pdf source has no stored file key');
      const bytes = await getStorage().read(key);
      const ex = await extractFromPdf(new Uint8Array(bytes));
      return repo.upsertDocument(src.id, ex.text, src.title, ex.metadata);
    }
    default:
      throw new Error(`No document and no extractor for source type "${src.type}"`);
  }
}

/**
 * The universal ingestion pipeline: extract → chunk → embed → ready.
 * Runs in-process (fire-and-forget from the request) and updates source.status
 * so the UI can poll progress. Idempotent: re-running replaces chunks.
 */
export async function runIngestionPipeline(sourceId: string): Promise<void> {
  const startedAt = Date.now();
  try {
    await repo.setStatus(sourceId, 'processing');
    const src = await repo.getSource(sourceId);
    if (!src) throw new Error('source not found');

    const doc = await ensureDocument(src);
    const chunks = chunkText(doc.text);

    if (chunks.length > 0) {
      const vectors = await embedInBatches(chunks.map((c) => c.text));
      await repo.insertChunksWithEmbeddings(doc.id, sourceId, chunks, vectors, EMBED_MODEL_NAME);
    }

    await repo.setStatus(sourceId, 'ready', { ingestedAt: new Date() });
    await repo.recordJob('ingest', sourceId, 'done', {
      finishedAt: new Date(),
      metadata: { chunks: chunks.length, ms: Date.now() - startedAt },
    });
    logger.info({ sourceId, chunks: chunks.length }, 'ingestion complete');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await repo.setStatus(sourceId, 'failed', { error: message }).catch(() => {});
    await repo.recordJob('ingest', sourceId, 'failed', { error: message, finishedAt: new Date() }).catch(
      () => {},
    );
    logger.error({ sourceId, err: message }, 'ingestion failed');
  }
}
