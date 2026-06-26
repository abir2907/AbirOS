import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  vector,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sourceTypeEnum, sourceStatusEnum, timestamps, softDelete } from './_shared.js';

/**
 * The polymorphic core: every ingested thing becomes a `source`, which produces
 * one or more `document`s, split into `chunk`s, each with an `embedding`. This
 * single pipeline makes every data type searchable the same way.
 */
export const source = pgTable(
  'source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: sourceTypeEnum('type').notNull(),
    title: text('title').notNull(),
    uri: text('uri'),
    mime: text('mime'),
    byteSize: bigint('byte_size', { mode: 'number' }),
    hash: text('hash'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }),
    status: sourceStatusEnum('status').notNull().default('pending'),
    error: text('error'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('source_hash_idx').on(t.hash), index('source_type_idx').on(t.type)],
);

export const document = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    title: text('title'),
    text: text('text').notNull(),
    lang: text('lang').default('en'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (t) => [index('document_source_idx').on(t.sourceId)],
);

/**
 * Chunk text for retrieval. `tsv` is a GENERATED tsvector column maintained by
 * Postgres (created in the SQL migration, not here) — search queries reference
 * it via raw SQL; it is intentionally omitted from this table object so Drizzle
 * never tries to write it.
 */
export const chunk = pgTable(
  'chunk',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    ord: integer('ord').notNull(),
    text: text('text').notNull(),
    tokenCount: integer('token_count').notNull().default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (t) => [index('chunk_document_idx').on(t.documentId), index('chunk_source_idx').on(t.sourceId)],
);

export const embedding = pgTable('embedding', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkId: uuid('chunk_id')
    .notNull()
    .unique()
    .references(() => chunk.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
  model: text('model').notNull(),
  ...timestamps,
});

export const tag = pgTable('tag', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  ...timestamps,
});

export const sourceTag = pgTable(
  'source_tag',
  {
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.tagId] })],
);

export type Source = typeof source.$inferSelect;
export type NewSource = typeof source.$inferInsert;
export type Document = typeof document.$inferSelect;
export type Chunk = typeof chunk.$inferSelect;
export type Embedding = typeof embedding.$inferSelect;
