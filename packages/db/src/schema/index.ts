/**
 * Drizzle schema.
 *
 * Phase 0: intentionally empty. The full polymorphic knowledge model
 * (source / document / chunk / embedding / entity / relation / ...) and all
 * feature tables land in Phase 1 with proper drizzle-kit migrations.
 *
 * Keeping this file as the single schema barrel means the Drizzle client and
 * `drizzle.config.ts` already point at the right place — Phase 1 only adds
 * table definitions here, no wiring changes.
 */
export {};
