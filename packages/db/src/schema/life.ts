import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  doublePrecision,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps, softDelete } from './_shared.js';

// ── Metrics time-series ──────────────────────────────────────────────────────
export const metric = pgTable('metric', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  unit: text('unit'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const metricPoint = pgTable(
  'metric_point',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    metricId: uuid('metric_id')
      .notNull()
      .references(() => metric.id, { onDelete: 'cascade' }),
    value: doublePrecision('value').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('metric_point_metric_idx').on(t.metricId, t.recordedAt)],
);

// ── Expenses ─────────────────────────────────────────────────────────────────
export const expense = pgTable(
  'expense',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spentOn: date('spent_on').notNull(),
    amount: doublePrecision('amount').notNull(),
    category: text('category'),
    merchant: text('merchant'),
    note: text('note'),
    recurring: boolean('recurring').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('expense_date_idx').on(t.spentOn), index('expense_merchant_idx').on(t.merchant)],
);

export const subscription = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  amount: doublePrecision('amount'),
  cadence: text('cadence'),
  nextChargeOn: date('next_charge_on'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Journal ──────────────────────────────────────────────────────────────────
export const journalEntry = pgTable(
  'journal_entry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryOn: date('entry_on').notNull(),
    title: text('title'),
    content: text('content').notNull().default(''),
    mood: integer('mood'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('journal_date_idx').on(t.entryOn)],
);

export type Metric = typeof metric.$inferSelect;
export type Expense = typeof expense.$inferSelect;
export type JournalEntry = typeof journalEntry.$inferSelect;
