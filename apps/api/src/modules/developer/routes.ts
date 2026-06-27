import { Router, type Router as RouterType } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { codeSearchSchema, activityQuerySchema } from './schemas.js';
import { syncGithub } from './service.js';
import { listRepos, searchCode, careerInsights, recentActivity } from './repo.js';

export const developerRouter: RouterType = Router();
developerRouter.use(requireAuth);

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
