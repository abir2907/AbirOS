import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import * as repo from './repo.js';
import * as svc from './service.js';
import * as s from './schemas.js';

export const plannerRouter: RouterType = Router();
plannerRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });
const today = () => new Date().toISOString().slice(0, 10);

// ── Calendar ─────────────────────────────────────────────────────────────────
plannerRouter.get('/calendar', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86_400_000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 86_400_000);
    res.json({ events: await repo.listEvents(from, to) });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/calendar', async (req, res, next) => {
  try {
    res.status(201).json(await repo.createEvent(s.createEventSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
plannerRouter.delete('/calendar/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deleteEvent(id))) throw HttpError.notFound('Event not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/calendar/import', async (req, res, next) => {
  try {
    const { ics } = s.importIcsSchema.parse(req.body);
    res.json(await svc.importIcs(ics));
  } catch (err) {
    next(err);
  }
});

// ── Daily plan ───────────────────────────────────────────────────────────────
plannerRouter.get('/today', async (req, res, next) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : today();
    res.json({ date, items: await repo.getPlan(date) });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/today/generate', async (req, res, next) => {
  try {
    const { date } = z.object({ date: s.planDateSchema.shape.date.default(today()) }).parse(req.body ?? {});
    res.json({ date, items: await svc.generateDailyPlan(date) });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/today/task', async (req, res, next) => {
  try {
    const { date, title, detail } = s.addTaskSchema.parse(req.body);
    res.status(201).json(await repo.addTask(date, title, detail));
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/plan/:id/toggle', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { done } = s.toggleDoneSchema.parse(req.body);
    if (!(await repo.togglePlanItem(id, done))) throw HttpError.notFound('Item not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Goals ────────────────────────────────────────────────────────────────────
plannerRouter.get('/goals', async (_req, res, next) => {
  try {
    res.json({ goals: await repo.listGoals() });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/goals', async (req, res, next) => {
  try {
    res.status(201).json(await repo.createGoal(s.createGoalSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
plannerRouter.get('/goals/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const g = await repo.getGoal(id);
    if (!g) throw HttpError.notFound('Goal not found');
    res.json(g);
  } catch (err) {
    next(err);
  }
});
plannerRouter.delete('/goals/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deleteGoal(id))) throw HttpError.notFound('Goal not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/goals/:id/steps', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { title } = s.addStepSchema.parse(req.body);
    const g = await repo.getGoal(id);
    if (!g) throw HttpError.notFound('Goal not found');
    res.status(201).json(await repo.addStep(id, title, g.steps.length));
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/goals/steps/:id/toggle', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { done } = s.toggleDoneSchema.parse(req.body);
    if (!(await repo.toggleStep(id, done))) throw HttpError.notFound('Step not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/goals/:id/simulate', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await svc.simulateGoal(id));
  } catch (err) {
    next(err);
  }
});

// ── University ───────────────────────────────────────────────────────────────
plannerRouter.get('/courses', async (_req, res, next) => {
  try {
    res.json({ courses: await repo.listCourses() });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/courses', async (req, res, next) => {
  try {
    res.status(201).json(await repo.createCourse(s.createCourseSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
plannerRouter.delete('/courses/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deleteCourse(id))) throw HttpError.notFound('Course not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
plannerRouter.get('/assignments', async (_req, res, next) => {
  try {
    res.json({ assignments: await repo.listAssignments() });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/assignments', async (req, res, next) => {
  try {
    res.status(201).json(await repo.createAssignment(s.createAssignmentSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/assignments/:id/toggle', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { status } = s.toggleStatusSchema.parse(req.body);
    if (!(await repo.toggleAssignment(id, status))) throw HttpError.notFound('Assignment not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
plannerRouter.get('/timetable', async (_req, res, next) => {
  try {
    res.json({ slots: await repo.listTimetable() });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/timetable', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addTimetableSlot(s.createTimetableSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
plannerRouter.get('/exams', async (_req, res, next) => {
  try {
    res.json({ exams: await repo.listExams() });
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/exams', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addExam(s.createExamSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
plannerRouter.post('/exam-plan/generate', async (_req, res, next) => {
  try {
    res.json(await svc.generateExamPlan());
  } catch (err) {
    next(err);
  }
});
