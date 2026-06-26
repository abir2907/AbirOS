import { pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { SOURCE_TYPES, SOURCE_STATUSES } from '@abiros/shared';

/** Postgres enums mirrored from the shared constants (single source of truth). */
export const sourceTypeEnum = pgEnum('source_type', [...SOURCE_TYPES] as [string, ...string[]]);
export const sourceStatusEnum = pgEnum('source_status', [
  ...SOURCE_STATUSES,
] as [string, ...string[]]);

/** Standard created/updated columns added to every table. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Soft-delete column for user content tables. */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
