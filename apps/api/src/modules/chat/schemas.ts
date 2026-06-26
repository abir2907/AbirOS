import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export const postMessageSchema = z.object({
  content: z.string().min(1).max(8000),
});
