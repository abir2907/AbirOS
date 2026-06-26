import { pgTable, uuid, text, doublePrecision, jsonb, index } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared.js';
import { source, chunk } from './knowledge.js';

/** Lightweight extracted entities + typed relations — powers the Knowledge Map. */
export const entity = pgTable(
  'entity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(), // person | project | concept | technology | ...
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (t) => [index('entity_norm_idx').on(t.normalizedName)],
);

export const entityMention = pgTable(
  'entity_mention',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityId: uuid('entity_id')
      .notNull()
      .references(() => entity.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id').references(() => chunk.id, { onDelete: 'set null' }),
    snippet: text('snippet'),
    ...timestamps,
  },
  (t) => [index('mention_entity_idx').on(t.entityId), index('mention_source_idx').on(t.sourceId)],
);

export const relation = pgTable(
  'relation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromEntityId: uuid('from_entity_id')
      .notNull()
      .references(() => entity.id, { onDelete: 'cascade' }),
    toEntityId: uuid('to_entity_id')
      .notNull()
      .references(() => entity.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // relates_to | prerequisite_of | part_of | authored_by | ...
    weight: doublePrecision('weight').notNull().default(1),
    ...timestamps,
  },
  (t) => [index('relation_from_idx').on(t.fromEntityId), index('relation_to_idx').on(t.toEntityId)],
);

export type Entity = typeof entity.$inferSelect;
export type Relation = typeof relation.$inferSelect;
