import { pgTable, uuid, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const interviewSession = pgTable('interview_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  topic: text('topic').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const interviewTurn = pgTable(
  'interview_turn',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSession.id, { onDelete: 'cascade' }),
    ord: integer('ord').notNull(),
    question: text('question').notNull(),
    answer: text('answer'),
    scores: jsonb('scores').$type<Record<string, number>>().default({}).notNull(),
    feedback: text('feedback'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_turn_session_idx').on(t.sessionId)],
);

export const resumeVersion = pgTable('resume_version', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull().default('Resume'),
  content: text('content').notNull(),
  jobDescription: text('job_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type InterviewSession = typeof interviewSession.$inferSelect;
export type InterviewTurn = typeof interviewTurn.$inferSelect;
export type ResumeVersion = typeof resumeVersion.$inferSelect;
