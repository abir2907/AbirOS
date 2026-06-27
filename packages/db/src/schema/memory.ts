import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

/** Durable facts the assistant should remember about the user. */
export const userMemory = pgTable(
  'user_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    source: text('source').notNull().default('manual'), // manual | assistant
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('user_memory_created_idx').on(t.createdAt)],
);

export type UserMemory = typeof userMemory.$inferSelect;
