import { z } from 'zod';
import { INTEREST_CATEGORIES, SENTIMENTS } from '@abiros/shared';

export const profileSchema = z.object({
  bio: z.string().max(4000).optional(),
  personality: z.string().max(2000).optional(),
  bigFive: z.record(z.number()).optional(),
  coreValues: z.array(z.string()).optional(),
  communicationPrefs: z.string().max(1000).optional(),
});

export const interestSchema = z.object({
  category: z.enum(INTEREST_CATEGORIES),
  label: z.string().min(1).max(120),
  sentiment: z.enum(SENTIMENTS).optional(),
  notes: z.string().optional(),
});

export const accomplishmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  happenedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  links: z.array(z.string()).optional(),
});
