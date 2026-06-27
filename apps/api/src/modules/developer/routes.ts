import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { codeSearchSchema, activityQuerySchema } from './schemas.js';
import { syncGithub } from './service.js';
import { listRepos, searchCode, careerInsights, recentActivity, timeMachine } from './repo.js';
import { startInterview, answerTurn, getInterview, listInterviews } from './interview.js';
import {
  generateResume,
  tailorResume,
  listResumeVersions,
  getResumeVersion,
} from './resume.js';
import { syncLeetcode, getLeetcodeProfile, searchSolvedProblems, weakTopics } from './leetcode.js';
import { analyzeResume } from './resumeAnalysis.js';

export const developerRouter: RouterType = Router();
developerRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

developerRouter.post('/github/sync', async (_req, res, next) => {
  try {
    res.json(await syncGithub());
  } catch (err) {
    next(err);
  }
});

developerRouter.get('/repos', async (_req, res, next) => {
  try {
    res.json({ repos: await listRepos() });
  } catch (err) {
    next(err);
  }
});

developerRouter.post('/code/search', async (req, res, next) => {
  try {
    const { query, k } = codeSearchSchema.parse(req.body);
    res.json({ query, hits: await searchCode(query, k ?? 20) });
  } catch (err) {
    next(err);
  }
});

developerRouter.get('/analyzer', async (_req, res, next) => {
  try {
    res.json(await careerInsights());
  } catch (err) {
    next(err);
  }
});

developerRouter.get('/activity', async (req, res, next) => {
  try {
    const { days } = activityQuerySchema.parse(req.query);
    res.json(await recentActivity(days));
  } catch (err) {
    next(err);
  }
});

developerRouter.get('/time-machine', async (_req, res, next) => {
  try {
    res.json(await timeMachine());
  } catch (err) {
    next(err);
  }
});

// ── LeetCode ─────────────────────────────────────────────────────────────────
developerRouter.post('/leetcode/sync', async (req, res, next) => {
  try {
    const { username } = z.object({ username: z.string().min(1).max(60) }).parse(req.body);
    res.json(await syncLeetcode(username));
  } catch (err) {
    next(err);
  }
});
developerRouter.get('/leetcode/stats', async (_req, res, next) => {
  try {
    res.json((await getLeetcodeProfile()) ?? null);
  } catch (err) {
    next(err);
  }
});
developerRouter.post('/leetcode/search', async (req, res, next) => {
  try {
    const { query } = z.object({ query: z.string().min(1) }).parse(req.body);
    res.json({ results: await searchSolvedProblems(query) });
  } catch (err) {
    next(err);
  }
});
developerRouter.get('/leetcode/weak-topics', async (_req, res, next) => {
  try {
    res.json(await weakTopics());
  } catch (err) {
    next(err);
  }
});

// ── Resume analysis ──────────────────────────────────────────────────────────
developerRouter.post('/resume/analyze', async (req, res, next) => {
  try {
    const { targetJd } = z.object({ targetJd: z.string().optional() }).parse(req.body ?? {});
    res.json(await analyzeResume(targetJd));
  } catch (err) {
    next(err);
  }
});

// ── Interview Coach ──────────────────────────────────────────────────────────
developerRouter.post('/interview/start', async (req, res, next) => {
  try {
    const { topic } = z.object({ topic: z.string().min(1).max(120) }).parse(req.body);
    res.status(201).json(await startInterview(topic));
  } catch (err) {
    next(err);
  }
});
developerRouter.post('/interview/:id/answer', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { answer } = z.object({ answer: z.string().min(1).max(5000) }).parse(req.body);
    res.json(await answerTurn(id, answer));
  } catch (err) {
    next(err);
  }
});
developerRouter.get('/interview', async (_req, res, next) => {
  try {
    res.json({ sessions: await listInterviews() });
  } catch (err) {
    next(err);
  }
});
developerRouter.get('/interview/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const data = await getInterview(id);
    if (!data) throw HttpError.notFound('Interview not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── Resume Evolution ─────────────────────────────────────────────────────────
developerRouter.post('/resume/generate', async (_req, res, next) => {
  try {
    res.status(201).json(await generateResume());
  } catch (err) {
    next(err);
  }
});
developerRouter.post('/resume/:id/tailor', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { jobDescription } = z.object({ jobDescription: z.string().min(1) }).parse(req.body);
    res.status(201).json(await tailorResume(id, jobDescription));
  } catch (err) {
    next(err);
  }
});
developerRouter.get('/resume', async (_req, res, next) => {
  try {
    res.json({ versions: await listResumeVersions() });
  } catch (err) {
    next(err);
  }
});
developerRouter.get('/resume/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const v = await getResumeVersion(id);
    if (!v) throw HttpError.notFound('Resume version not found');
    res.json(v);
  } catch (err) {
    next(err);
  }
});
