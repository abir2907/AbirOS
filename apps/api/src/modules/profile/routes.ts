import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { INTEREST_CATEGORIES } from '@abiros/shared';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { profileSchema, interestSchema, accomplishmentSchema } from './schemas.js';
import { getSelfModel } from './selfModel.js';
import * as repo from './repo.js';
import * as svc from './service.js';

export const profileRouter: RouterType = Router();
profileRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

profileRouter.get('/', async (_req, res, next) => {
  try {
    const [profile, interests, accomplishments] = await Promise.all([
      repo.getProfile(),
      repo.listInterests(),
      repo.listAccomplishments(),
    ]);
    res.json({ profile: profile ?? null, interests, accomplishments });
  } catch (err) {
    next(err);
  }
});

profileRouter.put('/profile', async (req, res, next) => {
  try {
    res.json(await svc.saveProfile(profileSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

profileRouter.get('/interests', async (req, res, next) => {
  try {
    const category = z.enum(INTEREST_CATEGORIES).optional().parse(req.query.category);
    res.json({ interests: await repo.listInterests(category) });
  } catch (err) {
    next(err);
  }
});

profileRouter.post('/interests', async (req, res, next) => {
  try {
    res.status(201).json(await svc.createInterest(interestSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

profileRouter.delete('/interests/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await svc.removeInterest(id))) throw HttpError.notFound('Interest not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

profileRouter.post('/accomplishments', async (req, res, next) => {
  try {
    res.status(201).json(await svc.createAccomplishment(accomplishmentSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

profileRouter.delete('/accomplishments/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await svc.removeAccomplishment(id))) throw HttpError.notFound('Accomplishment not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Preview the compiled "About Me" block injected into the assistant. */
profileRouter.get('/self-model', async (_req, res, next) => {
  try {
    res.json({ text: await getSelfModel() });
  } catch (err) {
    next(err);
  }
});
