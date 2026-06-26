/**
 * Seeds a few sample notes (ingested + embedded) so search and chat are
 * demonstrable immediately. Requires a migrated DB and a running Ollama.
 * Run: `pnpm db:seed` (from repo root). Safe to re-run (dedupes by title).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { createEmbeddingProvider, chunkText, type AiConfig } from '@abiros/ai';
import { getDb, closeDb } from '../src/client.js';
import { source, document, chunk, embedding } from '../src/schema/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../.env') });

const dims = Number(process.env.EMBED_DIMS ?? 768);
const aiConfig: AiConfig = {
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

const SAMPLES = [
  {
    title: 'AbirOS — what it is',
    content: `AbirOS is my personal AI operating system. It keeps one shared knowledge base about my
digital life — notes, PDFs, web articles, code, journal, and more — and lets an AI Command Center
answer questions and run workflows across all of it. It is single-user, self-hosted, and runs for
free on my own machine using Ollama for local AI and Postgres with pgvector for hybrid search.`,
  },
  {
    title: 'JWT authentication notes',
    content: `For authentication I use a JSON Web Token stored in an httpOnly, sameSite=lax cookie.
The password is hashed with bcrypt and kept out of the database, in an env var. On login the server
verifies the password and signs a JWT; middleware verifies that token on every protected route. This
avoids storing sessions server-side and keeps the single-user setup simple and safe on my LAN.`,
  },
  {
    title: 'Retrieval-augmented generation (RAG) cheatsheet',
    content: `RAG works by chunking documents into ~500-800 token pieces, embedding each chunk into a
vector, and storing those vectors. At query time you embed the question, find the nearest chunks by
cosine similarity, and also run a keyword full-text search. You fuse both rankings with Reciprocal
Rank Fusion, then feed the top chunks to the language model as context so it can answer with
citations instead of hallucinating.`,
  },
];

const embedder = createEmbeddingProvider(aiConfig);
const db = getDb();

try {
  for (const s of SAMPLES) {
    const existing = await db.select().from(source).where(eq(source.title, s.title)).limit(1);
    if (existing.length > 0) {
      console.log(`• skip (exists): ${s.title}`);
      continue;
    }
    const hash = createHash('sha256').update(`note:${s.content}`).digest('hex');
    const [src] = await db
      .insert(source)
      .values({ type: 'note', title: s.title, hash, mime: 'text/markdown', status: 'pending' })
      .returning();
    const [doc] = await db
      .insert(document)
      .values({ sourceId: src!.id, title: s.title, text: s.content })
      .returning();

    const chunks = chunkText(s.content);
    const vectors = await embedder.embed(chunks.map((c) => c.text));
    for (let i = 0; i < chunks.length; i++) {
      const [row] = await db
        .insert(chunk)
        .values({
          documentId: doc!.id,
          sourceId: src!.id,
          ord: chunks[i]!.ord,
          text: chunks[i]!.text,
          tokenCount: chunks[i]!.tokenCount,
        })
        .returning({ id: chunk.id });
      await db
        .insert(embedding)
        .values({ chunkId: row!.id, embedding: vectors[i]!, model: aiConfig.ollama.embedModel });
    }
    await db
      .update(source)
      .set({ status: 'ready', ingestedAt: new Date() })
      .where(eq(source.id, src!.id));
    console.log(`✓ seeded: ${s.title} (${chunks.length} chunk(s))`);
  }
  console.log('✓ Seed complete.');
} catch (err) {
  console.error('✗ Seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
