/**
 * Minimal forward-only SQL migrator. Applies every `migrations/*.sql` file (in
 * filename order) that hasn't run yet, tracked in a `_migrations` table, over
 * the Neon DIRECT connection. Each file runs in its own transaction.
 *
 * Why custom instead of drizzle-kit: our DDL uses pgvector, an HNSW index, a
 * generated tsvector column, and GIN indexes — hand-written SQL is the robust,
 * predictable path (see DECISIONS.md). Drizzle is still used for typed queries.
 *
 * Run: `pnpm db:migrate` (from repo root).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { sslFor } from '../src/ssl.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const url = process.env.DIRECT_DATABASE_URL;
if (!url) {
  console.error('✗ DIRECT_DATABASE_URL is not set. Add the Neon direct string to .env.');
  process.exit(1);
}

const migrationsDir = path.resolve(here, '../migrations');
const client = new pg.Client({ connectionString: url, ssl: sslFor(url) });

try {
  await client.connect();
  await client.query(
    'CREATE TABLE IF NOT EXISTS _migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const applied = new Set(
    (await client.query<{ id: string }>('SELECT id FROM _migrations')).rows.map((r) => r.id),
  );

  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    console.log(`→ applying ${file}…`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      ran++;
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(ran === 0 ? '✓ Database already up to date.' : `✓ Applied ${ran} migration(s).`);
} catch (err) {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
