/**
 * Provider-agnostic AI interfaces. ALL feature code depends only on these —
 * never on a concrete provider. Swapping Ollama for a hosted API is an env
 * change (see providers/index.ts), never a call-site rewrite.
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Msg {
  role: Role;
  content: string;
  /** For role:'tool' — which tool call this result answers. */
  toolCallId?: string;
  /** Optional tool/function name for tool messages. */
  name?: string;
}

/** A tool the LLM may call. `parameters` is a JSON Schema object. */
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatOptions {
  system?: string;
  messages: Msg[];
  tools?: ToolDef[];
  /** Ask the model to return strict JSON. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResult {
  content: string;
  toolCalls?: ToolCall[];
  raw?: unknown;
}

/** One streamed delta. `done` marks the final event (may carry tool calls). */
export interface LLMStreamChunk {
  delta: string;
  done: boolean;
  toolCalls?: ToolCall[];
}

export interface LLMProvider {
  readonly id: string;
  readonly model: string;
  chat(opts: ChatOptions): Promise<LLMResult>;
  /** Token streaming for the chat UI (SSE). Wired up fully in Phase 1. */
  stream?(opts: ChatOptions): AsyncIterable<LLMStreamChunk>;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dims: number;
  embed(texts: string[]): Promise<number[][]>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
