import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import { timestamps, softDelete } from './_shared.js';

/** Project memory — group sources under a project with structured fields. */
export const project = pgTable('project', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  architecture: text('architecture'),
  apiNotes: text('api_notes'),
  decisions: text('decisions'),
  ...timestamps,
  ...softDelete,
});

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;
