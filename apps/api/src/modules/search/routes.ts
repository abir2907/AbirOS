import { Router, type Router as RouterType } from 'express';
import { searchRequestSchema } from '@abiros/shared';
import { requireAuth } from '../../middleware/auth.js';
import { hybridSearch } from './service.js';

export const searchRouter: RouterType = Router();
searchRouter.use(requireAuth);

searchRouter.post('/', async (req, res, next) => {
  try {
    const { query, k } = searchRequestSchema.parse(req.body);
    const hits = await hybridSearch(query, k ?? 8);
    res.json({ query, hits });
  } catch (err) {
    next(err);
  }
});
