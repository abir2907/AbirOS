import { AiProviderError, type ChatOptions, type LLMProvider, type LLMResult } from '../types.js';

/**
 * Anthropic Messages API adapter. DISABLED unless ANTHROPIC_API_KEY is set.
 * Chat only (Anthropic has no embeddings endpoint — keep EMBEDDING_PROVIDER on
 * ollama or openai_compatible).
 */
export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic';
  constructor(
    private readonly cfg: { apiKey: string; model: string; baseUrl?: string },
  ) {
    if (!cfg.apiKey) {
      throw new AiProviderError(
        'Anthropic provider selected but ANTHROPIC_API_KEY is not set.',
        this.id,
      );
    }
  }
  get model() {
    return this.cfg.model;
  }

  async chat(opts: ChatOptions): Promise<LLMResult> {
    const base = this.cfg.baseUrl ?? 'https://api.anthropic.com';
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        system: opts.system,
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.4,
        messages: opts.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new AiProviderError(`messages ${res.status}`, this.id, await res.text());
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const content = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');
    return { content, raw: data };
  }
}
