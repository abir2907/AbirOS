import { z } from 'zod';
import { BOOK_STATUSES, PLACE_STATUSES, SPORT_KINDS } from '@abiros/shared';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const importSchema = z.object({ takeout: z.string().min(1) });

export const bookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().optional(),
  status: z.enum(BOOK_STATUSES).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  startedOn: isoDate.optional(),
  finishedOn: isoDate.optional(),
  notes: z.string().optional(),
});
export const bookPatchSchema = bookSchema.partial();

export const sportSchema = z.object({
  kind: z.enum(SPORT_KINDS).optional(),
  label: z.string().min(1).max(120),
  notes: z.string().optional(),
});

export const placeSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  status: z.enum(PLACE_STATUSES).optional(),
  notes: z.string().optional(),
});
export const placePatchSchema = placeSchema.partial();

export const tripSchema = z.object({
  title: z.string().min(1).max(200),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  summary: z.string().optional(),
});

export const planTripSchema = z.object({ query: z.string().optional() });
