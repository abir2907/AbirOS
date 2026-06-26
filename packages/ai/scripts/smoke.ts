/**
 * Embedding smoke test — proves the local AI layer works end to end.
 * Run: `pnpm ai:smoke` (from repo root).
 *
 * Embeds the string "hello" through whichever EMBEDDING_PROVIDER is configured
 * (Ollama by default) and asserts the vector has the expected dimensionality.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { createEmbeddingProvider, type AiConfig } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const dims = Number(process.env.EMBED_DIMS ?? 768);
const cfg: AiConfig = {
  llmProvider: 'ollama',
  embeddingProvider: (process.env.EMBEDDING_PROVIDER as AiConfig['embeddingProvider']) ?? 'ollama',
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL ?? 'qwen2.5:7b-instruct',
    embedModel: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
    dims,
  },
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL ?? '',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: 'gpt-4o-mini',
    embedModel: 'text-embedding-3-small',
    dims,
  },
  anthropic: { apiKey: process.env.ANTHROPIC_API_KEY ?? '', model: 'claude-haiku-4-5-20251001' },
};

const provider = createEmbeddingProvider(cfg);
console.log(`→ Embedding "hello" via "${provider.id}" (model: ${provider.model})…`);

const [vec] = await provider.embed(['hello']);
if (!vec || vec.length === 0) {
  console.error('✗ No embedding returned.');
  process.exit(1);
}
console.log(`✓ Got a ${vec.length}-dim vector. First 5: [${vec.slice(0, 5).map((n) => n.toFixed(4)).join(', ')}]`);
if (vec.length !== dims) {
  console.warn(
    `⚠ Expected ${dims} dims (EMBED_DIMS) but got ${vec.length}. Update EMBED_DIMS / the vector column to match.`,
  );
}
console.log('✓ Embedding smoke test passed.');
