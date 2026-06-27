import { pgTable, uuid, text, integer, doublePrecision, boolean, jsonb, date, timestamp, index } from 'drizzle-orm/pg-core';
import { source } from './knowledge.js';

export const mealLog = pgTable(
  'meal_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eatenAt: timestamp('eaten_at', { withTimezone: true }).notNull().defaultNow(),
    mealType: text('meal_type').notNull().default('snack'),
    items: jsonb('items').$type<string[]>().default([]).notNull(),
    calories: doublePrecision('calories'),
    proteinG: doublePrecision('protein_g'),
    carbsG: doublePrecision('carbs_g'),
    fatG: doublePrecision('fat_g'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('meal_log_eaten_idx').on(t.eatenAt)],
);

export const workout = pgTable(
  'workout',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
    type: text('type').notNull().default('strength'),
    durationMin: integer('duration_min'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('workout_at_idx').on(t.performedAt)],
);

export const exercise = pgTable('exercise', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  muscleGroup: text('muscle_group'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workoutSet = pgTable(
  'workout_set',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workoutId: uuid('workout_id').notNull().references(() => workout.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id').references(() => exercise.id, { onDelete: 'set null' }),
    reps: integer('reps'),
    weight: doublePrecision('weight'),
    rpe: doublePrecision('rpe'),
    ord: integer('ord').notNull().default(0),
  },
  (t) => [index('workout_set_workout_idx').on(t.workoutId)],
);

export const biomarker = pgTable('biomarker', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  unit: text('unit'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const biomarkerReading = pgTable(
  'biomarker_reading',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    biomarkerId: uuid('biomarker_id').notNull().references(() => biomarker.id, { onDelete: 'cascade' }),
    value: doublePrecision('value').notNull(),
    unit: text('unit'),
    referenceLow: doublePrecision('reference_low'),
    referenceHigh: doublePrecision('reference_high'),
    takenOn: date('taken_on'),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    outOfRange: boolean('out_of_range').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('biomarker_reading_idx').on(t.biomarkerId, t.takenOn)],
);

export type MealLog = typeof mealLog.$inferSelect;
export type Workout = typeof workout.$inferSelect;
export type BiomarkerReading = typeof biomarkerReading.$inferSelect;
