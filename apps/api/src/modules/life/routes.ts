import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import * as repo from './repo.js';
import * as svc from './service.js';
import * as s from './schemas.js';

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
