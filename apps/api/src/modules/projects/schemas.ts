import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  architecture: z.string().optional(),
  apiNotes: z.string().optional(),
  decisions: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const linkSourceSchema = z.object({
  sourceId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
});
