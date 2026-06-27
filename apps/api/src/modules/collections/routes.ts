import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { BOOK_STATUSES, PLACE_STATUSES } from '@abiros/shared';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import * as s from './schemas.js';
import * as repo from './repo.js';
import * as svc from './service.js';

export const collectionsRouter: RouterType = Router();
collectionsRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

// ── Music ────────────────────────────────────────────────────────────────────
collectionsRouter.post('/music/import', async (req, res, next) => {
  try {
    const { takeout } = s.importSchema.parse(req.body);
    res.json(await svc.importTakeout(takeout));
  } catch (err) {
    next(err);
  }
});
collectionsRouter.get('/music/taste', async (_req, res, next) => {
  try {
    res.json(await svc.musicTaste());
  } catch (err) {
    next(err);
  }
});

// ── Books ────────────────────────────────────────────────────────────────────
collectionsRouter.get('/books', async (req, res, next) => {
  try {
    const status = z.enum(BOOK_STATUSES).optional().parse(req.query.status);
    res.json({ books: await repo.listBooks(status) });
  } catch (err) {
    next(err);
  }
});
collectionsRouter.get('/books/recommend', async (_req, res, next) => {
  try {
    res.json(await svc.recommendBook());
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/books', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addBook(s.bookSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/books/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const row = await repo.updateBook(id, s.bookPatchSchema.parse(req.body));
    if (!row) throw HttpError.notFound('Book not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});
collectionsRouter.delete('/books/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deleteBook(id))) throw HttpError.notFound('Book not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Sports ───────────────────────────────────────────────────────────────────
collectionsRouter.get('/sports', async (_req, res, next) => {
  try {
    res.json({ sports: await repo.listSports() });
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/sports', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addSport(s.sportSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
collectionsRouter.delete('/sports/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deleteSport(id))) throw HttpError.notFound('Not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Places ───────────────────────────────────────────────────────────────────
collectionsRouter.get('/places', async (req, res, next) => {
  try {
    const status = z.enum(PLACE_STATUSES).optional().parse(req.query.status);
    res.json({ places: await repo.listPlaces(status) });
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/places', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addPlace(s.placeSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/places/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const row = await repo.updatePlace(id, s.placePatchSchema.parse(req.body));
    if (!row) throw HttpError.notFound('Place not found');
    res.json(row);
  } catch (err) {
    next(err);
  }
});
collectionsRouter.delete('/places/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    if (!(await repo.deletePlace(id))) throw HttpError.notFound('Place not found');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Trips ────────────────────────────────────────────────────────────────────
collectionsRouter.get('/trips', async (_req, res, next) => {
  try {
    res.json({ trips: await repo.listTrips() });
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/trips', async (req, res, next) => {
  try {
    res.status(201).json(await repo.addTrip(s.tripSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/trips/:id/places', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const { placeId } = z.object({ placeId: z.string().uuid() }).parse(req.body);
    res.json({ places: await repo.linkTripPlace(id, placeId) });
  } catch (err) {
    next(err);
  }
});
collectionsRouter.post('/trips/plan', async (req, res, next) => {
  try {
    const { query } = s.planTripSchema.parse(req.body ?? {});
    res.json(await svc.planTrip(query ?? ''));
  } catch (err) {
    next(err);
  }
});
