import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { getSettings, setEnabledModules, usage, purgeAll } from './service.js';

export const settingsRouter: RouterType = Router();
settingsRouter.use(requireAuth);

settingsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await getSettings());
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/enabled-modules', async (req, res, next) => {
  try {
    const { modules } = z.object({ modules: z.array(z.string()) }).parse(req.body);
    res.json({ enabledModules: await setEnabledModules(modules) });
  } catch (err) {
    next(err);
  }
});

settingsRouter.get('/usage', async (_req, res, next) => {
  try {
    res.json({ usage: await usage() });
  } catch (err) {
    next(err);
  }
});

/** Danger zone: wipe all user content (requires confirm: "DELETE"). */
settingsRouter.post('/purge', async (req, res, next) => {
  try {
    z.object({ confirm: z.literal('DELETE') }).parse(req.body);
    res.json(await purgeAll());
  } catch (err) {
    next(err);
  }
});
