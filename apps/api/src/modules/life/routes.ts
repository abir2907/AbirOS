import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import * as repo from './repo.js';
import * as svc from './service.js';
import * as s from './schemas.js';
import * as diet from './diet.js';
import * as gym from './gym.js';
import * as health from './health.js';

const mealSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  items: z.array(z.string()).optional(),
  calories: z.number().optional(),
  proteinG: z.number().optional(),
  carbsG: z.number().optional(),
  fatG: z.number().optional(),
  notes: z.string().optional(),
});
const workoutSchema = z.object({
  type: z.enum(['strength', 'cardio', 'mobility']).optional(),
  durationMin: z.number().int().optional(),
  notes: z.string().optional(),
  sets: z
    .array(
      z.object({
        exerciseName: z.string().optional(),
        reps: z.number().int().optional(),
        weight: z.number().optional(),
        rpe: z.number().optional(),
      }),
    )
    .optional(),
});

export const lifeRouter: RouterType = Router();
lifeRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

// ── Metrics ──────────────────────────────────────────────────────────────────
lifeRouter.get('/metrics', async (_req, res, next) => {
  try {
    res.json({ metrics: await repo.listMetrics() });
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/metrics', async (req, res, next) => {
  try {
    const { name, unit } = s.createMetricSchema.parse(req.body);
    res.status(201).json(await repo.createMetric(name, unit));
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/metrics/:id/points', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { value, recordedAt, note } = s.addPointSchema.parse(req.body);
    res.status(201).json(await repo.addPoint(id, value, recordedAt, note));
  } catch (err) {
    next(err);
  }
});
lifeRouter.get('/metrics/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const data = await svc.metricAnalytics(id);
    if (!data) throw HttpError.notFound('Metric not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── Expenses ─────────────────────────────────────────────────────────────────
lifeRouter.get('/expenses', async (_req, res, next) => {
  try {
    res.json({ expenses: await repo.listExpenses(), categories: await repo.categorySummary() });
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/expenses', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addExpense(s.addExpenseSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/expenses/import', async (req, res, next) => {
  try {
    const { csv } = s.importCsvSchema.parse(req.body);
    res.json(await svc.importExpenseCsv(csv));
  } catch (err) {
    next(err);
  }
});
lifeRouter.get('/expenses/insights', async (_req, res, next) => {
  try {
    res.json(await svc.expenseInsights());
  } catch (err) {
    next(err);
  }
});

// ── Journal ──────────────────────────────────────────────────────────────────
lifeRouter.get('/journal', async (_req, res, next) => {
  try {
    res.json({ entries: await repo.listJournal() });
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/journal', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addJournal(s.addJournalSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

// ── Life Replay timeline ─────────────────────────────────────────────────────
lifeRouter.get('/timeline', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 90 * 86_400_000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 86_400_000);
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    res.json({ events: await repo.timeline(from, to, q) });
  } catch (err) {
    next(err);
  }
});

// ── Cross-module insights ─────────────────────────────────────────────────────
lifeRouter.get('/correlations', async (_req, res, next) => {
  try {
    res.json(await svc.correlations());
  } catch (err) {
    next(err);
  }
});

lifeRouter.get('/weekly-review', async (_req, res, next) => {
  try {
    res.json(await svc.weeklyReview());
  } catch (err) {
    next(err);
  }
});

// ── Diet ──────────────────────────────────────────────────────────────────────
lifeRouter.get('/diet', async (_req, res, next) => {
  try {
    res.json({ meals: await diet.listMeals(), summary: await diet.dietSummary(14) });
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/diet', async (req, res, next) => {
  try {
    res.status(201).json(await diet.addMeal(mealSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
lifeRouter.delete('/diet/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await diet.deleteMeal(id))) throw HttpError.notFound('Meal not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Gym ───────────────────────────────────────────────────────────────────────
lifeRouter.get('/gym', async (_req, res, next) => {
  try {
    res.json({ workouts: await gym.listWorkouts(), consistency: await gym.workoutConsistency() });
  } catch (err) {
    next(err);
  }
});
lifeRouter.post('/gym', async (req, res, next) => {
  try {
    res.status(201).json(await gym.addWorkout(workoutSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
lifeRouter.get('/gym/:id/sets', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json({ sets: await gym.workoutSets(id) });
  } catch (err) {
    next(err);
  }
});
lifeRouter.delete('/gym/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await gym.deleteWorkout(id))) throw HttpError.notFound('Workout not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Health / biomarkers (NOT medical advice) ──────────────────────────────────
lifeRouter.post('/health/extract', async (req, res, next) => {
  try {
    const { sourceId } = z.object({ sourceId: z.string().uuid() }).parse(req.body);
    res.json({ ...(await health.extractBiomarkers(sourceId)), disclaimer: health.HEALTH_DISCLAIMER });
  } catch (err) {
    next(err);
  }
});
lifeRouter.get('/health/biomarkers', async (_req, res, next) => {
  try {
    res.json({ biomarkers: await health.listBiomarkers(), disclaimer: health.HEALTH_DISCLAIMER });
  } catch (err) {
    next(err);
  }
});
lifeRouter.get('/health/biomarkers/:name', async (req, res, next) => {
  try {
    const name = z.string().min(1).parse(req.params.name);
    const data = await health.biomarkerSeries(name);
    if (!data) throw HttpError.notFound('Biomarker not found');
    res.json({ ...data, disclaimer: health.HEALTH_DISCLAIMER });
  } catch (err) {
    next(err);
  }
});

// ── Personal Dataset Generator ───────────────────────────────────────────────
lifeRouter.get('/dataset', async (req, res, next) => {
  try {
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="abiros-dataset.csv"');
      res.send(await svc.datasetCsv());
      return;
    }
    res.json({ rows: await svc.datasetJson() });
  } catch (err) {
    next(err);
  }
});
