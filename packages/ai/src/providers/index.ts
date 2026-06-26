import type { EmbeddingProviderId, LlmProviderId } from '@abiros/shared';
import type { EmbeddingProvider, LLMProvider } from '../types.js';
import { OllamaProvider } from './ollama.js';
import { OpenAiCompatibleProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';

export interface AiConfig {
  llmProvider: LlmProviderId;
  embeddingProvider: EmbeddingProviderId;
  ollama: { baseUrl: string; chatModel: string; embedModel: string; dims: number };
  openai: { baseUrl: string; apiKey: string; model: string; embedModel: string; dims: number };
  anthropic: { apiKey: string; model: string };
}

/** Build the chat/reasoning provider selected by env. */
export function createLlmProvider(cfg: AiConfig): LLMProvider {
  switch (cfg.llmProvider) {
    case 'ollama':
      return new OllamaProvider(cfg.ollama);
    case 'openai_compatible':
      return new OpenAiCompatibleProvider({ ...cfg.openai });
    case 'anthropic':
      return new AnthropicProvider(cfg.anthropic);
  }
}

/** Build the embedding provider selected by env (Anthropic has no embeddings). */
export function createEmbeddingProvider(cfg: AiConfig): EmbeddingProvider {
  switch (cfg.embeddingProvider) {
    case 'ollama':
      return new OllamaProvider(cfg.ollama);
    case 'openai_compatible':
      return new OpenAiCompatibleProvider({ ...cfg.openai });
  }
}

export { OllamaProvider, OpenAiCompatibleProvider, AnthropicProvider };
