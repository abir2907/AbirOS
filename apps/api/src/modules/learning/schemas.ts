import { z } from 'zod';

export const generateSchema = z.object({
  sourceId: z.string().uuid(),
  n: z.coerce.number().int().min(1).max(20).optional(),
});

export const reviewSchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

export const attemptSchema = z.object({
  answers: z.array(z.number().int().min(-1)),
});
