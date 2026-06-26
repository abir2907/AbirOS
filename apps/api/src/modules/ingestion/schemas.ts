import { z } from 'zod';

export const ingestNoteSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
});

export const ingestUrlSchema = z.object({
  url: z.string().url(),
});

export type IngestNoteInput = z.infer<typeof ingestNoteSchema>;
export type IngestUrlInput = z.infer<typeof ingestUrlSchema>;
