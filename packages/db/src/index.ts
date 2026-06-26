/**
 * @abiros/db — Drizzle client + schema for AbirOS.
 * Runtime uses the POOLED Neon connection (`DATABASE_URL`); migrations use the
 * DIRECT connection (`DIRECT_DATABASE_URL`, see scripts/migrate.ts).
 */
export { getDb, getPool, closeDb, schema, type Db } from './client.js';
export { sslFor } from './ssl.js';
export * from './schema/index.js';
export * as tables from './schema/index.js';

/** Format a JS number[] as a pgvector literal for parameterized queries. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
