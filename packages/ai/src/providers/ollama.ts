import {
  AiProviderError,
  type ChatOptions,
  type EmbeddingProvider,
  type LLMProvider,
  type LLMResult,
  type LLMStreamChunk,
  type Msg,
  type ToolCall,
} from '../types.js';

interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
  dims: number;
}

function toOllamaMessages(system: string | undefined, messages: Msg[]) {
  const out: { role: string; content: string }[] = [];
  if (system) out.push({ role: 'system', content: system });
  for (const m of messages) {
    out.push({ role: m.role === 'tool' ? 'tool' : m.role, content: m.content });
  }
  return out;
}

/** Local Ollama server. Default provider for both chat and embeddings. */
export class OllamaProvider implements LLMProvider, EmbeddingProvider {
  readonly id = 'ollama';
  readonly model: string;
  readonly dims: number;
  private readonly cfg: OllamaConfig;

  constructor(cfg: OllamaConfig) {
    this.cfg = cfg;
    this.model = cfg.chatModel;
    this.dims = cfg.dims;
  }

  get embedModel() {
    return this.cfg.embedModel;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.cfg.embedModel, input: texts }),
      });
      if (!res.ok) {
        throw new Error(`Ollama /api/embed returned ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { embeddings?: number[][] };
      if (!data.embeddings || data.embeddings.length !== texts.length) {
        throw new Error('Ollama returned an unexpected embeddings shape.');
      }
      return data.embeddings;
    } catch (err) {
      throw new AiProviderError(
        `Embedding failed (is Ollama running at ${this.cfg.baseUrl} with "${this.cfg.embedModel}" pulled?)`,
        this.id,
        err,
      );
    }
  }

  async chat(opts: ChatOptions): Promise<LLMResult> {
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.cfg.chatModel,
          messages: toOllamaMessages(opts.system, opts.messages),
          tools: opts.tools?.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
          stream: false,
          format: opts.json ? 'json' : undefined,
          options: { temperature: opts.temperature ?? 0.4 },
        }),
      });
      if (!res.ok) {
        throw new Error(`Ollama /api/chat returned ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as {
        message?: {
          content?: string;
          tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
        };
      };
      const toolCalls: ToolCall[] | undefined = data.message?.tool_calls?.map((tc, i) => ({
        id: `call_${i}`,
        name: tc.function.name,
        arguments: tc.function.arguments ?? {},
      }));
      return { content: data.message?.content ?? '', toolCalls, raw: data };
    } catch (err) {
      throw new AiProviderError(
        `Chat failed (is Ollama running at ${this.cfg.baseUrl} with "${this.cfg.chatModel}" pulled?)`,
        this.id,
        err,
      );
    }
  }

  async *stream(opts: ChatOptions): AsyncIterable<LLMStreamChunk> {
    const res = await fetch(`${this.cfg.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.cfg.chatModel,
        messages: toOllamaMessages(opts.system, opts.messages),
        stream: true,
        options: { temperature: opts.temperature ?? 0.4 },
      }),
    });
    if (!res.ok || !res.body) {
      throw new AiProviderError(`Ollama stream returned ${res.status}`, this.id);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const obj = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        yield { delta: obj.message?.content ?? '', done: Boolean(obj.done) };
      }
    }
  }

  /** Lightweight liveness probe for the health endpoint. */
  async ping(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/tags`);
      return res.ok
        ? { ok: true }
        : { ok: false, detail: `Ollama responded ${res.status}` };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : 'unreachable' };
    }
  }
}
