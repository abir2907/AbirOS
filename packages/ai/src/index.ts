/**
 * @abiros/ai — provider-agnostic AI layer.
 * Feature code imports the interfaces + factories here; it must never import a
 * concrete provider directly. Provider selection is driven by env (AiConfig).
 */
export * from './types.js';
export * from './chunk.js';
export * from './rrf.js';
export {
  createLlmProvider,
  createEmbeddingProvider,
  OllamaProvider,
  OpenAiCompatibleProvider,
  AnthropicProvider,
  type AiConfig,
} from './providers/index.js';
