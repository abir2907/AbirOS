import { logger } from '../../lib/logger.js';
import { ingestNote } from '../ingestion/service.js';
import { invalidateSelfModel } from './selfModel.js';
import * as repo from './repo.js';
import { profile, interest, accomplishment } from '@abiros/db';

export async function saveProfile(values: Partial<typeof profile.$inferInsert>) {
  const row = await repo.upsertProfile(values);
  invalidateSelfModel();
  return row;
}

export async function createInterest(values: typeof interest.$inferInsert) {
  const row = await repo.addInterest(values);
  invalidateSelfModel();
  return row;
}

export async function removeInterest(id: string) {
  const ok = await repo.deleteInterest(id);
  invalidateSelfModel();
  return ok;
}

export async function createAccomplishment(values: typeof accomplishment.$inferInsert) {
  const row = await repo.addAccomplishment(values);
  invalidateSelfModel();
  // Embed it into the knowledge base so it's searchable (best-effort).
  const text = [row.description, row.happenedOn].filter(Boolean).join('\n');
  ingestNote({ title: `Accomplishment: ${row.title}`, content: text || row.title })
    .then((src) => repo.linkAccomplishmentSource(row.id, src.id))
    .catch((err) => logger.warn({ err }, 'accomplishment embed skipped'));
  return row;
}

export async function removeAccomplishment(id: string) {
  const ok = await repo.deleteAccomplishment(id);
  invalidateSelfModel();
  return ok;
}
