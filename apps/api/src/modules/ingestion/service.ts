import { logger } from '../../lib/logger.js';
import { hashString, hashBytes, getStorage } from '../../lib/storage.js';
import { HttpError } from '../../lib/errors.js';
import * as repo from './repo.js';
import { runIngestionPipeline } from './pipeline.js';

/** Fire-and-forget: kick off processing without blocking the HTTP response. */
function kick(sourceId: string) {
  void runIngestionPipeline(sourceId).catch((err) =>
    logger.error({ sourceId, err }, 'pipeline crashed'),
  );
}

export async function ingestNote(input: { title: string; content: string }) {
  const hash = hashString(`note:${input.content}`);
  const dup = await repo.findReadyByHash(hash);
  if (dup) return dup;

  const src = await repo.createSource({
    type: 'note',
    title: input.title,
    hash,
    mime: 'text/markdown',
    byteSize: Buffer.byteLength(input.content, 'utf8'),
    status: 'pending',
  });
  await repo.createNote(src.id, input.title, input.content);
  // Note text is known now — create the document so the pipeline just chunks+embeds.
  await repo.upsertDocument(src.id, input.content, input.title);
  kick(src.id);
  return src;
}

export async function ingestUrl(input: { url: string }) {
  const hash = hashString(`url:${input.url}`);
  const dup = await repo.findReadyByHash(hash);
  if (dup) return dup;

  const src = await repo.createSource({
    type: 'web_article',
    title: input.url,
    uri: input.url,
    hash,
    mime: 'text/html',
    status: 'pending',
  });
  kick(src.id);
  return src;
}

export async function ingestFile(file: { buffer: Buffer; originalname: string; mimetype: string }) {
  const isPdf = file.mimetype === 'application/pdf';
  const isImage = file.mimetype.startsWith('image/');
  if (!isPdf && !isImage) {
    throw HttpError.validation('Only PDF and image files are supported.');
  }
  const hash = hashBytes(file.buffer); // exact-content dedupe
  const dup = await repo.findReadyByHash(hash);
  if (dup) return dup;

  const { uri } = await getStorage().save(hash, file.buffer);
  const src = await repo.createSource({
    // Images are OCR'd as "screenshots" (the Smart Screenshot Manager).
    type: isPdf ? 'pdf' : 'screenshot',
    title: file.originalname,
    uri,
    mime: file.mimetype,
    byteSize: file.buffer.byteLength,
    hash,
    status: 'pending',
    metadata: { storageKey: hash, filename: file.originalname },
  });
  kick(src.id);
  return src;
}
