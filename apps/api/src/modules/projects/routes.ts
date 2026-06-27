import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { createProjectSchema, updateProjectSchema, linkSourceSchema } from './schemas.js';
import * as repo from './repo.js';

export const projectsRouter: RouterType = Router();
projectsRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

projectsRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ projects: await repo.listProjects() });
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await repo.createProject(createProjectSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const p = await repo.getProject(id);
    if (!p) throw HttpError.notFound('Project not found');
    res.json(p);
  } catch (err) {
    next(err);
  }
});

projectsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const updated = await repo.updateProject(id, updateProjectSchema.parse(req.body));
    if (!updated) throw HttpError.notFound('Project not found');
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

projectsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const ok = await repo.softDeleteProject(id);
    if (!ok) throw HttpError.notFound('Project not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Attach (or detach with projectId:null) a source to a project. */
projectsRouter.post('/link', async (req, res, next) => {
  try {
    const { sourceId, projectId } = linkSourceSchema.parse(req.body);
    const ok = await repo.setSourceProject(sourceId, projectId);
    if (!ok) throw HttpError.notFound('Source not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
