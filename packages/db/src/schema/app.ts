import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { timestamps, softDelete } from './_shared.js';
import { source } from './knowledge.js';

/** Single-user account row (auth verifies against env; this stores profile/meta). */
export const appUser = pgTable('app_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  ...timestamps,
});

/** Markdown notebook entries; each is also indexed as a `source` of type note. */
export const note = pgTable(
  'note',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    contentMarkdown: text('content_markdown').notNull().default(''),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('note_source_idx').on(t.sourceId)],
);

export const chatSession = pgTable('chat_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('New chat'),
  ...timestamps,
  ...softDelete,
});

export const chatMessage = pgTable(
  'chat_message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSession.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // system | user | assistant | tool
    content: text('content').notNull().default(''),
    toolCalls: jsonb('tool_calls').$type<unknown[]>().default([]).notNull(),
    citations: jsonb('citations').$type<unknown[]>().default([]).notNull(),
    ...timestamps,
  },
  (t) => [index('message_session_idx').on(t.sessionId)],
);

/** Key/value app settings (enabled modules, provider prefs, ...). */
export const setting = pgTable('setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Audit of background jobs (ingestion pipeline steps, etc.). */
export const jobRun = pgTable(
  'job_run',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobName: text('job_name').notNull(),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('running'), // running | done | failed
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  },
  (t) => [index('jobrun_source_idx').on(t.sourceId)],
);

export type ChatSession = typeof chatSession.$inferSelect;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type Note = typeof note.$inferSelect;
