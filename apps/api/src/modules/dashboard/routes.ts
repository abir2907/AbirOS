import { Router, type Router as RouterType } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { dashboardSummary } from './service.js';

export const dashboardRouter: RouterType = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    res.json(await dashboardSummary());
  } catch (err) {
    next(err);
  }
});
