import { z } from 'zod';
import { GOAL_HORIZONS } from '@abiros/shared';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
});

export const importIcsSchema = z.object({ ics: z.string().min(1) });

export const planDateSchema = z.object({ date: isoDate });
export const addTaskSchema = z.object({ date: isoDate, title: z.string().min(1), detail: z.string().optional() });
export const toggleDoneSchema = z.object({ done: z.boolean() });

export const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: isoDate.optional(),
  horizon: z.enum(GOAL_HORIZONS).optional(),
  category: z.string().optional(),
  why: z.string().optional(),
  isLifeGoal: z.boolean().optional(),
});
export const addStepSchema = z.object({ title: z.string().min(1) });

export const createCourseSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  term: z.string().optional(),
  color: z.string().optional(),
});
export const createAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1),
  dueAt: z.coerce.date().optional(),
  weight: z.number().optional(),
});
export const toggleStatusSchema = z.object({ status: z.enum(['todo', 'done']) });
export const createTimetableSchema = z.object({
  courseId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
});
export const createExamSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1),
  examAt: z.coerce.date().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});
