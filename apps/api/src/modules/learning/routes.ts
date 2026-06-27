import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { STUDY_STATUSES } from '@abiros/shared';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { generateSchema, reviewSchema, attemptSchema } from './schemas.js';
import { summarizeSource, makeFlashcards, makeQuiz, reviewCard } from './service.js';
import * as repo from './repo.js';
import * as study from './study.js';

const createStudySchema = z.object({
  topic: z.string().min(1).max(200),
  status: z.enum(STUDY_STATUSES).optional(),
  resourceLinks: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  notes: z.string().optional(),
});
const updateStudySchema = z.object({
  topic: z.string().min(1).optional(),
  status: z.enum(STUDY_STATUSES).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  notes: z.string().optional(),
});

export const learningRouter: RouterType = Router();
learningRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

// ── Summaries ────────────────────────────────────────────────────────────────
learningRouter.post('/summary', async (req, res, next) => {
  try {
    const { sourceId } = generateSchema.parse(req.body);
    res.json(await summarizeSource(sourceId));
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/summary/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const s = await repo.getSummary(id);
    if (!s) throw HttpError.notFound('No summary yet');
    res.json(s);
  } catch (err) {
    next(err);
  }
});

// ── Flashcards ───────────────────────────────────────────────────────────────
learningRouter.post('/flashcards/generate', async (req, res, next) => {
  try {
    const { sourceId, n } = generateSchema.parse(req.body);
    res.status(201).json(await makeFlashcards(sourceId, n ?? 8));
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/flashcards', async (_req, res, next) => {
  try {
    res.json({ cards: await repo.listFlashcards() });
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/flashcards/due', async (_req, res, next) => {
  try {
    res.json({ count: await repo.countDue(), cards: await repo.dueFlashcards() });
  } catch (err) {
    next(err);
  }
});

learningRouter.post('/flashcards/:id/review', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { rating } = reviewSchema.parse(req.body);
    res.json(await reviewCard(id, rating));
  } catch (err) {
    next(err);
  }
});

// ── Quizzes ──────────────────────────────────────────────────────────────────
learningRouter.post('/quiz/generate', async (req, res, next) => {
  try {
    const { sourceId, n } = generateSchema.parse(req.body);
    res.status(201).json(await makeQuiz(sourceId, n ?? 5));
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/quiz', async (_req, res, next) => {
  try {
    res.json({ quizzes: await repo.listQuizzes() });
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/quiz/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const q = await repo.getQuizForTaking(id);
    if (!q) throw HttpError.notFound('Quiz not found');
    res.json(q);
  } catch (err) {
    next(err);
  }
});

learningRouter.post('/quiz/:id/attempt', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { answers } = attemptSchema.parse(req.body);
    const result = await repo.gradeAttempt(id, answers);
    if (!result) throw HttpError.notFound('Quiz not found');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Gaps ─────────────────────────────────────────────────────────────────────
learningRouter.get('/gaps', async (_req, res, next) => {
  try {
    res.json({ gaps: await repo.knowledgeGaps() });
  } catch (err) {
    next(err);
  }
});

// ── Study backlog ─────────────────────────────────────────────────────────────
learningRouter.get('/study', async (req, res, next) => {
  try {
    const status = z.enum(STUDY_STATUSES).optional().parse(req.query.status);
    res.json({ items: await study.listStudyItems(status) });
  } catch (err) {
    next(err);
  }
});
learningRouter.post('/study', async (req, res, next) => {
  try {
    res.status(201).json(await study.addStudyItem(createStudySchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
learningRouter.post('/study/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const row = await study.updateStudyItem(id, updateStudySchema.parse(req.body));
    if (!row) throw HttpError.notFound('Study item not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});
learningRouter.delete('/study/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await study.deleteStudyItem(id))) throw HttpError.notFound('Study item not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
learningRouter.get('/study/suggest-next', async (_req, res, next) => {
  try {
    res.json(await study.suggestNextStudy());
  } catch (err) {
    next(err);
  }
});
