import { pgTable, uuid, text, integer, doublePrecision, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared.js';
import { resumeVersion } from './career.js';

export const leetcodeProfile = pgTable('leetcode_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  totalSolved: integer('total_solved').notNull().default(0),
  easy: integer('easy').notNull().default(0),
  medium: integer('medium').notNull().default(0),
  hard: integer('hard').notNull().default(0),
  ranking: integer('ranking'),
  lastSynced: timestamp('last_synced', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const lcProblem = pgTable('lc_problem', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  difficulty: text('difficulty'),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  myStatus: text('my_status'),
  ...timestamps,
});

export const lcSubmission = pgTable(
  'lc_submission',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title'),
    lang: text('lang'),
    status: text('status'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('lc_submission_uq').on(t.slug, t.submittedAt)],
);

export const skill = pgTable('skill', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  level: doublePrecision('level').notNull().default(0),
  source: text('source'),
  ...timestamps,
});

export const skillSignal = pgTable('skill_signal', {
  id: uuid('id').primaryKey().defaultRandom(),
  skillId: uuid('skill_id').notNull().references(() => skill.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  weight: doublePrecision('weight').notNull().default(1),
  detail: text('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const resumeAnalysis = pgTable('resume_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeVersionId: uuid('resume_version_id').references(() => resumeVersion.id, { onDelete: 'set null' }),
  targetJd: text('target_jd'),
  result: jsonb('result').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LeetcodeProfile = typeof leetcodeProfile.$inferSelect;
export type LcProblem = typeof lcProblem.$inferSelect;
export type Skill = typeof skill.$inferSelect;
