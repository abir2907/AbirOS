import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit uses the DIRECT (unpooled) Neon connection — schema migrations and
 * advisory locks misbehave over the pooler. The running app, by contrast, uses
 * the pooled `DATABASE_URL` (see src/client.ts).
 */
const url = process.env.DIRECT_DATABASE_URL;
if (!url) {
  throw new Error('DIRECT_DATABASE_URL is required for drizzle-kit (use the Neon direct string).');
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url, ssl: 'require' },
  verbose: true,
  strict: true,
});
