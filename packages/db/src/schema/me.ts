import { pgEnum, pgTable, uuid, text, integer, jsonb, date, index } from 'drizzle-orm/pg-core';
import {
  INTEREST_CATEGORIES,
  SENTIMENTS,
  STUDY_STATUSES,
  GOAL_HORIZONS,
} from '@abiros/shared';
import { timestamps } from './_shared.js';
import { source } from './knowledge.js';
import { entity } from './graph.js';

export const interestCategoryEnum = pgEnum('interest_category', [
  ...INTEREST_CATEGORIES,
] as [string, ...string[]]);
export const interestSentimentEnum = pgEnum('interest_sentiment', [
  ...SENTIMENTS,
] as [string, ...string[]]);
export const goalHorizonEnum = pgEnum('goal_horizon', [...GOAL_HORIZONS] as [string, ...string[]]);
export const studyStatusEnum = pgEnum('study_status', [...STUDY_STATUSES] as [string, ...string[]]);

/** Singleton self-profile. */
export const profile = pgTable('profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  bio: text('bio'),
  personality: text('personality'),
  bigFive: jsonb('big_five').$type<Record<string, number>>(),
  coreValues: jsonb('core_values').$type<string[]>().default([]).notNull(),
  communicationPrefs: text('communication_prefs'),
  summary: text('summary'),
  ...timestamps,
});

export const interest = pgTable(
  'interest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: interestCategoryEnum('category').notNull().default('other'),
    label: text('label').notNull(),
    sentiment: interestSentimentEnum('sentiment').notNull().default('like'),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('interest_category_idx').on(t.category)],
);

export const accomplishment = pgTable(
  'accomplishment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    happenedOn: date('happened_on'),
    links: jsonb('links').$type<string[]>().default([]).notNull(),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('accomplishment_date_idx').on(t.happenedOn)],
);

export const studyItem = pgTable(
  'study_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topic: text('topic').notNull(),
    status: studyStatusEnum('status').notNull().default('want_to_study'),
    resourceLinks: jsonb('resource_links').$type<string[]>().default([]).notNull(),
    priority: integer('priority').notNull().default(0),
    notes: text('notes'),
    linkedEntityId: uuid('linked_entity_id').references(() => entity.id, { onDelete: 'set null' }),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('study_item_status_idx').on(t.status)],
);

export type Profile = typeof profile.$inferSelect;
export type Interest = typeof interest.$inferSelect;
export type Accomplishment = typeof accomplishment.$inferSelect;
export type StudyItem = typeof studyItem.$inferSelect;
