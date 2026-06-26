import { createLlmProvider, createEmbeddingProvider } from '@abiros/ai';
import type { EmbeddingProvider, LLMProvider } from '@abiros/ai';
import { aiConfig } from '../env.js';

/** Process-wide AI provider singletons, selected by env (see env.ts aiConfig). */
let llm: LLMProvider | undefined;
let embedder: EmbeddingProvider | undefined;

export function getLlm(): LLMProvider {
  if (!llm) llm = createLlmProvider(aiConfig);
  return llm;
}

export function getEmbedder(): EmbeddingProvider {
  if (!embedder) embedder = createEmbeddingProvider(aiConfig);
  return embedder;
}

export const EMBED_MODEL_NAME =
  aiConfig.embeddingProvider === 'ollama' ? aiConfig.ollama.embedModel : aiConfig.openai.embedModel;
