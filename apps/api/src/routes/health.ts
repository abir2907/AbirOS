import { Router, type Router as RouterType } from 'express';
import type { Health } from '@abiros/shared';
import { getPool } from '@abiros/db';
import { env } from '../env.js';

const startedAt = Date.now();

async function checkDb(): Promise<{ ok: boolean; detail?: string }> {
  if (!env.DATABASE_URL) return { ok: false, detail: 'DATABASE_URL not configured (set up Neon)' };
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    const { rows } = await pool.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
    );
    if (rows.length === 0) {
      return { ok: false, detail: 'connected, but pgvector not enabled — run `pnpm db:enable-vector`' };
    }
    return { ok: true, detail: `pgvector ${rows[0].extversion}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'query failed' };
  }
}

async function checkOllama(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ok: false, detail: `Ollama responded ${res.status}` };
    const data = (await res.json()) as { models?: { name: string }[] };
    return { ok: true, detail: `${data.models?.length ?? 0} model(s) available` };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? `unreachable: ${err.message}` : 'unreachable',
    };
  }
}

export const healthRouter: RouterType = Router();

healthRouter.get('/health', async (_req, res) => {
  const [db, ollama] = await Promise.all([checkDb(), checkOllama()]);
  const checks = { db, ollama };
  const allOk = Object.values(checks).every((c) => c.ok);
  const body: Health = {
    status: allOk ? 'ok' : 'degraded',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checks,
  };
  res.status(200).json(body);
});
