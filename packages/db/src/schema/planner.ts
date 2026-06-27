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

// ── Goals + simulator ────────────────────────────────────────────────────────
export const goal = pgTable('goal', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: date('target_date'),
  status: text('status').notNull().default('active'),
  ...timestamps,
  ...softDelete,
});

export const goalStep = pgTable(
  'goal_step',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goal.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    done: boolean('done').notNull().default(false),
    ord: integer('ord').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('goal_step_goal_idx').on(t.goalId)],
);

export const goalSnapshot = pgTable(
  'goal_snapshot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goal.id, { onDelete: 'cascade' }),
    probability: doublePrecision('probability').notNull(),
    rationale: text('rationale'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('goal_snapshot_goal_idx').on(t.goalId)],
);

// ── Calendar + daily plan ────────────────────────────────────────────────────
export const calendarEvent = pgTable(
  'calendar_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    location: text('location'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    allDay: boolean('all_day').notNull().default(false),
    source: text('source').notNull().default('manual'),
    uid: text('uid'),
    ...timestamps,
  },
  (t) => [index('calendar_start_idx').on(t.startAt)],
);

export const planItem = pgTable(
  'plan_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planDate: date('plan_date').notNull(),
    title: text('title').notNull(),
    detail: text('detail'),
    startTime: text('start_time'),
    endTime: text('end_time'),
    kind: text('kind').notNull().default('task'),
    refId: uuid('ref_id'),
    done: boolean('done').notNull().default(false),
    ord: integer('ord').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('plan_item_date_idx').on(t.planDate)],
);

// ── University companion ─────────────────────────────────────────────────────
export const course = pgTable('course', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code'),
  term: text('term'),
  color: text('color'),
  ...timestamps,
  ...softDelete,
});

export const assignment = pgTable(
  'assignment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    status: text('status').notNull().default('todo'),
    weight: doublePrecision('weight'),
    ...timestamps,
  },
  (t) => [index('assignment_course_idx').on(t.courseId), index('assignment_due_idx').on(t.dueAt)],
);

export const timetableSlot = pgTable(
  'timetable_slot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    location: text('location'),
  },
  (t) => [index('timetable_course_idx').on(t.courseId)],
);

export const exam = pgTable(
  'exam',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    examAt: timestamp('exam_at', { withTimezone: true }),
    location: text('location'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('exam_course_idx').on(t.courseId)],
);

export type Goal = typeof goal.$inferSelect;
export type CalendarEvent = typeof calendarEvent.$inferSelect;
export type PlanItem = typeof planItem.$inferSelect;
export type Course = typeof course.$inferSelect;
export type Assignment = typeof assignment.$inferSelect;
