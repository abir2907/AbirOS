import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { extractForSource, extractAll } from './service.js';
import { getGraph } from './repo.js';

export const knowledgeRouter: RouterType = Router();
knowledgeRouter.use(requireAuth);

knowledgeRouter.get('/graph', async (_req, res, next) => {
  try {
    res.json(await getGraph());
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.post('/extract/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    res.json(await extractForSource(id));
  } catch (err) {
    next(err);
  }
});

knowledgeRouter.post('/extract-all', async (_req, res, next) => {
  try {
    res.json(await extractAll());
  } catch (err) {
    next(err);
  }
});
