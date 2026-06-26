/**
 * @abiros/db — Drizzle client + schema for AbirOS.
 * Runtime uses the POOLED Neon connection (`DATABASE_URL`); migrations use the
 * DIRECT connection (`DIRECT_DATABASE_URL`, see drizzle.config.ts).
 */
export { getDb, getPool, closeDb, schema, type Db } from './client.js';
export { sslFor } from './ssl.js';
export * as tables from './schema/index.js';
