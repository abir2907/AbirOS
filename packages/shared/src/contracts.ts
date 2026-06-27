import { z } from 'zod';
import { SOURCE_TYPES, SOURCE_STATUSES } from './constants.js';

/** Summary of a `source` row for lists and citations. */
export interface SourceSummary {
  id: string;
  type: (typeof SOURCE_TYPES)[number];
  title: string;
  uri: string | null;
  status: (typeof SOURCE_STATUSES)[number];
  error: string | null;
  projectId: string | null;
  createdAt: string;
  ingestedAt: string | null;
}

/** One retrieved chunk with its parent-source citation info. */
export interface SearchHit {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: (typeof SOURCE_TYPES)[number];
  text: string;
  score: number;
}

/** A numbered citation the chat answer refers to as [n]. */
export interface Citation {
  n: number;
  sourceId: string;
  title: string;
  type: (typeof SOURCE_TYPES)[number];
}

export const searchRequestSchema = z.object({
  query: z.string().min(1),
  k: z.coerce.number().int().min(1).max(50).optional(),
  types: z.array(z.enum(SOURCE_TYPES)).optional(),
});
export type SearchRequest = z.infer<typeof searchRequestSchema>;

/** Server-sent events streamed by the chat endpoint. */
export type ChatStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'token'; value: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; message: string };
