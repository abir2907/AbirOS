import { z } from 'zod';

export const codeSearchSchema = z.object({
  query: z.string().min(1),
  k: z.coerce.number().int().min(1).max(50).optional(),
});

export const activityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});
