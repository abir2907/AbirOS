import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { listMemories, addMemory, deleteMemory } from './repo.js';

export const memoryRouter: RouterType = Router();
memoryRouter.use(requireAuth);

memoryRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ memories: await listMemories() });
  } catch (err) {
    next(err);
  }
});

memoryRouter.post('/', async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(500) }).parse(req.body);
    res.status(201).json(await addMemory(content));
  } catch (err) {
    next(err);
  }
});

memoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (!(await deleteMemory(id))) throw HttpError.notFound('Memory not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
