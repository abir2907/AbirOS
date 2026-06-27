import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const createMetricSchema = z.object({
  name: z.string().min(1).max(60),
  unit: z.string().max(20).optional(),
});

export const addPointSchema = z.object({
  value: z.number(),
  recordedAt: z.coerce.date().optional(),
  note: z.string().optional(),
});

export const addExpenseSchema = z.object({
  spentOn: isoDate,
  amount: z.number().positive(),
  category: z.string().optional(),
  merchant: z.string().optional(),
  note: z.string().optional(),
  recurring: z.boolean().optional(),
});

export const importCsvSchema = z.object({ csv: z.string().min(1) });

export const addJournalSchema = z.object({
  entryOn: isoDate,
  title: z.string().optional(),
  content: z.string().min(1),
  mood: z.number().int().min(1).max(5).optional(),
});
