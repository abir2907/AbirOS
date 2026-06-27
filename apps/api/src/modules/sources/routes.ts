import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { paginationQuerySchema } from '@abiros/shared';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { listSources, getSourceDetail, getSourceChunks, softDeleteSource } from './repo.js';

export const sourcesRouter: RouterType = Router();
sourcesRouter.use(requireAuth);

sourcesRouter.get('/', async (req, res, next) => {
  try {
    const { limit, offset } = paginationQuerySchema.parse(req.query);
    res.json(await listSources(limit, offset));
  } catch (err) {
    next(err);
  }
});

sourcesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const detail = await getSourceDetail(id);
    if (!detail) throw HttpError.notFound('Source not found');
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

sourcesRouter.get('/:id/chunks', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    res.json({ chunks: await getSourceChunks(id) });
  } catch (err) {
    next(err);
  }
});

sourcesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const ok = await softDeleteSource(id);
    if (!ok) throw HttpError.notFound('Source not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
