/**
 * Enables the pgvector extension on Neon over the DIRECT connection, then
 * verifies it. Run: `pnpm db:enable-vector` (from repo root).
 *
 * This is the Phase 0 stand-in for the first real migration. In Phase 1 the
 * extension creation moves into the initial Drizzle migration.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import { sslFor } from '../src/ssl.js';

// Load the repo-root .env regardless of where the script is invoked from.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const url = process.env.DIRECT_DATABASE_URL;
if (!url) {
  console.error('✗ DIRECT_DATABASE_URL is not set. Add the Neon direct string to .env.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: sslFor(url) });

try {
  console.log('→ Connecting to Neon (direct)…');
  await client.connect();
  console.log('→ CREATE EXTENSION IF NOT EXISTS vector;');
  await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  const { rows } = await client.query(
    "SELECT extversion FROM pg_extension WHERE extname = 'vector';",
  );
  if (rows.length === 0) {
    console.error('✗ vector extension was not created.');
    process.exit(1);
  }
  console.log(`✓ pgvector is enabled (version ${rows[0].extversion}).`);
} catch (err) {
  console.error('✗ Failed to enable pgvector:', err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
