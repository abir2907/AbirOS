import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { generateSchema, reviewSchema, attemptSchema } from './schemas.js';
import { summarizeSource, makeFlashcards, makeQuiz, reviewCard } from './service.js';
import * as repo from './repo.js';

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
