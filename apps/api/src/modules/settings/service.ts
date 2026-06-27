import { eq } from 'drizzle-orm';
import { getDb, getPool, setting } from '@abiros/db';
import { MODULE_IDS } from '@abiros/shared';
import { aiConfig, env } from '../../env.js';

export async function getSettings() {
  const db = getDb();
  const [row] = await db.select().from(setting).where(eq(setting.key, 'enabled_modules')).limit(1);
  const enabledModules = (row?.value as string[] | undefined) ?? [...MODULE_IDS];
  return {
    providers: {
      llm: aiConfig.llmProvider,
      embedding: aiConfig.embeddingProvider,
      chatModel: aiConfig.llmProvider === 'ollama' ? aiConfig.ollama.chatModel : '(hosted)',
      embedModel: aiConfig.embeddingProvider === 'ollama' ? aiConfig.ollama.embedModel : '(hosted)',
      ollamaBaseUrl: env.OLLAMA_BASE_URL,
    },
    integrations: { github: Boolean(env.GITHUB_TOKEN) },
    allModules: [...MODULE_IDS],
    enabledModules,
  };
}

export async function setEnabledModules(ids: string[]) {
  const db = getDb();
  await db
    .insert(setting)
    .values({ key: 'enabled_modules', value: ids })
    .onConflictDoUpdate({ target: setting.key, set: { value: ids, updatedAt: new Date() } });
  return ids;
}

const USAGE_TABLES = [
  'source',
  'document',
  'chunk',
  'embedding',
  'git_commit',
  'repo',
  'flashcard',
  'quiz',
  'expense',
  'metric_point',
  'journal_entry',
  'chat_message',
];

/** Approximate DB usage (row counts) so the user can watch the Neon free tier. */
export async function usage() {
  const pool = getPool();
  const out: { table: string; rows: number }[] = [];
  for (const t of USAGE_TABLES) {
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`);
    out.push({ table: t, rows: rows[0]?.n ?? 0 });
  }
  return out;
}

// Root content tables — TRUNCATE ... CASCADE clears all dependents (chunks,
// embeddings, turns, etc.). Excludes app_user, setting, and _migrations.
const PURGE_TABLES = [
  'source',
  'repo',
  'flashcard',
  'quiz',
  'summary',
  'expense',
  'subscription',
  'metric',
  'journal_entry',
  'goal',
  'calendar_event',
  'plan_item',
  'course',
  'interview_session',
  'resume_version',
  'chat_session',
  'entity',
  'tag',
  'project',
];

export async function purgeAll() {
  await getPool().query(`TRUNCATE ${PURGE_TABLES.join(', ')} CASCADE`);
  return { ok: true as const };
}
