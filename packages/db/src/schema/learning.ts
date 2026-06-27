import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps, softDelete } from './_shared.js';
import { source } from './knowledge.js';

/** LLM-generated summary + key points for a source. */
export const summary = pgTable('summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .notNull()
    .unique()
    .references(() => source.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().default([]).notNull(),
  model: text('model'),
  ...timestamps,
});

/** A spaced-repetition flashcard (SM-2 state lives on the row). */
export const flashcard = pgTable(
  'flashcard',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    front: text('front').notNull(),
    back: text('back').notNull(),
    ease: doublePrecision('ease').notNull().default(2.5),
    interval: integer('interval').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('flashcard_due_idx').on(t.dueAt), index('flashcard_source_idx').on(t.sourceId)],
);

export const reviewLog = pgTable(
  'review_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flashcardId: uuid('flashcard_id')
      .notNull()
      .references(() => flashcard.id, { onDelete: 'cascade' }),
    rating: text('rating').notNull(),
    quality: integer('quality').notNull(),
    prevInterval: integer('prev_interval'),
    newInterval: integer('new_interval'),
    ease: doublePrecision('ease'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('review_log_card_idx').on(t.flashcardId)],
);

export const quiz = pgTable('quiz', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  ...timestamps,
});

export const quizQuestion = pgTable(
  'quiz_question',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quiz.id, { onDelete: 'cascade' }),
    ord: integer('ord').notNull(),
    question: text('question').notNull(),
    options: jsonb('options').$type<string[]>().default([]).notNull(),
    answerIndex: integer('answer_index').notNull(),
    explanation: text('explanation'),
  },
  (t) => [index('quiz_question_quiz_idx').on(t.quizId)],
);

export const quizAttempt = pgTable(
  'quiz_attempt',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quiz.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    answers: jsonb('answers').$type<number[]>().default([]).notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quiz_attempt_quiz_idx').on(t.quizId)],
);

export type Flashcard = typeof flashcard.$inferSelect;
export type Quiz = typeof quiz.$inferSelect;
export type QuizQuestion = typeof quizQuestion.$inferSelect;
export type Summary = typeof summary.$inferSelect;
