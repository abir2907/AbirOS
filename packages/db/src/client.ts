import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sslFor } from './ssl.js';
import * as schema from './schema/index.js';

const { Pool } = pg;

export type Db = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let db: Db | undefined;

/**
 * Returns the shared Drizzle client, created lazily from the *pooled* Neon
 * connection string (`DATABASE_URL`). Safe to call many times — one Pool is
 * reused for the process.
 */
export function getDb(connectionString = process.env.DATABASE_URL): Db {
  if (db) return db;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set — cannot create the database client.');
  }
  pool = new Pool({
    connectionString,
    ssl: sslFor(connectionString),
    max: 10,
    // Neon free tier autosuspends; give the first (cold-start) query room.
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
  });
  db = drizzle(pool, { schema });
  return db;
}

export function getPool(): pg.Pool {
  if (!pool) getDb();
  return pool!;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}

export { schema };
