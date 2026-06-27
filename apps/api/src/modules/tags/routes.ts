import { Router, type Router as RouterType } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listTagsWithCounts } from './repo.js';

export const tagsRouter: RouterType = Router();
tagsRouter.use(requireAuth);

tagsRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ tags: await listTagsWithCounts() });
  } catch (err) {
    next(err);
  }
});
