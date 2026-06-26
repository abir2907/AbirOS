import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { LLM_PROVIDERS, EMBEDDING_PROVIDERS } from '@abiros/shared';
import type { AiConfig } from '@abiros/ai';

// Load the repo-root .env (works regardless of cwd).
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const bool = (def: boolean) =>
  z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true'));

/**
 * Phase 0 keeps DB/auth/AI env OPTIONAL so the app boots and the health page can
 * report exactly what still needs configuring (Neon, Ollama, password). Phase 1
 * promotes JWT_SECRET / AUTH_* / DATABASE_URL to required.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),

  AUTH_USERNAME: z.string().default('abir'),
  AUTH_PASSWORD_HASH: z.string().default(''),
  JWT_SECRET: z.string().default('dev_insecure_change_me'),
  COOKIE_SECURE: bool(false),

  DATABASE_URL: z.string().default(''),
  DIRECT_DATABASE_URL: z.string().default(''),

  LLM_PROVIDER: z.enum(LLM_PROVIDERS).default('ollama'),
  EMBEDDING_PROVIDER: z.enum(EMBEDDING_PROVIDERS).default('ollama'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_CHAT_MODEL: z.string().default('qwen2.5:7b-instruct'),
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),
  EMBED_DIMS: z.coerce.number().int().positive().default(768),
  OPENAI_BASE_URL: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().default(''),

  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./data/files'),

  GITHUB_TOKEN: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('✗ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const aiConfig: AiConfig = {
  llmProvider: env.LLM_PROVIDER,
  embeddingProvider: env.EMBEDDING_PROVIDER,
  ollama: {
    baseUrl: env.OLLAMA_BASE_URL,
    chatModel: env.OLLAMA_CHAT_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL,
    dims: env.EMBED_DIMS,
  },
  openai: {
    baseUrl: env.OPENAI_BASE_URL,
    apiKey: env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    embedModel: 'text-embedding-3-small',
    dims: env.EMBED_DIMS,
  },
  anthropic: { apiKey: env.ANTHROPIC_API_KEY, model: 'claude-haiku-4-5-20251001' },
};

/** Warnings for things that are optional in Phase 0 but needed for full function. */
export function configWarnings(): string[] {
  const w: string[] = [];
  if (!env.DATABASE_URL) w.push('DATABASE_URL is empty — database features are disabled.');
  if (!env.AUTH_PASSWORD_HASH) w.push('AUTH_PASSWORD_HASH is empty — run `pnpm setup:password`.');
  if (env.JWT_SECRET === 'dev_insecure_change_me')
    w.push('JWT_SECRET is the insecure default — set a long random value before exposing on LAN.');
  return w;
}
