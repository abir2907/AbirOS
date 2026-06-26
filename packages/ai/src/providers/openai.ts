import {
  AiProviderError,
  type ChatOptions,
  type EmbeddingProvider,
  type LLMProvider,
  type LLMResult,
} from '../types.js';

/**
 * OpenAI-compatible adapter (works with OpenAI, LM Studio, vLLM, OpenRouter,
 * etc.). DISABLED unless OPENAI_BASE_URL + OPENAI_API_KEY are set. Kept as a
 * drop-in so a hosted model is a config change, never a code change.
 */
export class OpenAiCompatibleProvider implements LLMProvider, EmbeddingProvider {
  readonly id = 'openai_compatible';
  constructor(
    private readonly cfg: {
      baseUrl: string;
      apiKey: string;
      model: string;
      embedModel: string;
      dims: number;
    },
  ) {
    if (!cfg.baseUrl || !cfg.apiKey) {
      throw new AiProviderError(
        'OpenAI-compatible provider selected but OPENAI_BASE_URL / OPENAI_API_KEY are not set.',
        this.id,
      );
    }
  }
  get model() {
    return this.cfg.model;
  }
  get dims() {
    return this.cfg.dims;
  }

  private headers() {
    return { 'content-type': 'application/json', authorization: `Bearer ${this.cfg.apiKey}` };
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch(`${this.cfg.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.cfg.embedModel, input: texts }),
    });
    if (!res.ok) throw new AiProviderError(`embeddings ${res.status}`, this.id, await res.text());
    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data.map((d) => d.embedding);
  }

  async chat(opts: ChatOptions): Promise<LLMResult> {
    const messages = [
      ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.cfg.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        response_format: opts.json ? { type: 'json_object' } : undefined,
        tools: opts.tools?.map((t) => ({ type: 'function', function: t })),
      }),
    });
    if (!res.ok) throw new AiProviderError(`chat ${res.status}`, this.id, await res.text());
    const data = (await res.json()) as {
      choices: { message: { content: string | null } }[];
    };
    return { content: data.choices[0]?.message?.content ?? '', raw: data };
  }
}
