import type {
  ApiError,
  ChatStreamEvent,
  Health,
  Paginated,
  SearchHit,
  SourceSummary,
} from '@abiros/shared';

/**
 * Thin typed fetch wrapper. Requests are relative and Vite proxies them to the
 * Express API (single origin, cookies included).
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  let body: ApiError | undefined;
  try {
    body = (await res.json()) as ApiError;
  } catch {
    /* non-JSON error */
  }
  throw new ApiRequestError(
    res.status,
    body?.error.code ?? 'UNKNOWN',
    body?.error.message ?? res.statusText,
    body?.error.details,
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { credentials: 'include' }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { method: 'DELETE', credentials: 'include' }));
}

// ── Health ───────────────────────────────────────────────────────────────
export const getHealth = () => apiGet<Health>('/health');

// ── Auth ─────────────────────────────────────────────────────────────────
export interface Me {
  username: string;
}
export const login = (username: string, password: string) =>
  apiPost<Me>('/api/auth/login', { username, password });
export const logout = () => apiPost<{ ok: true }>('/api/auth/logout');
export const getMe = () => apiGet<Me>('/api/auth/me');

// ── Ingestion ──────────────────────────────────────────────────────────────
export const ingestNote = (title: string, content: string) =>
  apiPost<SourceSummary>('/api/ingest/note', { title, content });
export const ingestUrl = (url: string) => apiPost<SourceSummary>('/api/ingest/url', { url });
export async function ingestFile(file: File): Promise<SourceSummary> {
  const form = new FormData();
  form.append('file', file);
  return handle<SourceSummary>(
    await fetch('/api/ingest/file', { method: 'POST', credentials: 'include', body: form }),
  );
}

// ── Sources ────────────────────────────────────────────────────────────────
export const listSources = (limit = 50, offset = 0) =>
  apiGet<Paginated<SourceSummary>>(`/api/sources?limit=${limit}&offset=${offset}`);
export interface SourceDetail extends SourceSummary {
  metadata: Record<string, unknown>;
  chunkCount: number;
  preview: string | null;
  tags: string[];
}
export const getSource = (id: string) => apiGet<SourceDetail>(`/api/sources/${id}`);
export const deleteSource = (id: string) => apiDelete<{ ok: true }>(`/api/sources/${id}`);

// ── Search ───────────────────────────────────────────────────────────────
export const search = (query: string, k?: number) =>
  apiPost<{ query: string; hits: SearchHit[] }>('/api/search', { query, k });

// ── Chat ─────────────────────────────────────────────────────────────────
export interface ChatSessionRow {
  id: string;
  title: string;
  createdAt: string;
}
export interface ChatMessageRow {
  id: string;
  role: string;
  content: string;
  citations: import('@abiros/shared').Citation[];
  createdAt: string;
}
export const createSession = (title?: string) =>
  apiPost<ChatSessionRow>('/api/chat/sessions', title ? { title } : {});
export const listSessions = () => apiGet<ChatSessionRow[]>('/api/chat/sessions');
export const getSessionDetail = (id: string) =>
  apiGet<{ session: ChatSessionRow; messages: ChatMessageRow[] }>(`/api/chat/sessions/${id}`);

/** POST a message and consume the SSE stream, invoking onEvent per event. */
export async function streamChat(
  sessionId: string,
  content: string,
  onEvent: (e: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new ApiRequestError(res.status, 'STREAM', 'Failed to start chat stream');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const dataLine = part.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (json) onEvent(JSON.parse(json) as ChatStreamEvent);
    }
  }
}

// ── Tags ───────────────────────────────────────────────────────────────────
export const listTags = () => apiGet<{ tags: { name: string; count: number }[] }>('/api/tags');

// ── Projects ─────────────────────────────────────────────────────────────────
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  architecture: string | null;
  apiNotes: string | null;
  decisions: string | null;
}
export const listProjects = () => apiGet<{ projects: ProjectRow[] }>('/api/projects');
export const createProject = (body: { name: string; description?: string }) =>
  apiPost<ProjectRow>('/api/projects', body);
export const linkSource = (sourceId: string, projectId: string | null) =>
  apiPost<{ ok: true }>('/api/projects/link', { sourceId, projectId });

// ── Developer (GitHub) ───────────────────────────────────────────────────────
export interface RepoRow {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  pushedAt: string | null;
}
export interface CodeHit {
  kind: 'commit' | 'repo';
  title: string;
  detail: string;
  url: string | null;
  date: string | null;
}
export interface CareerInsights {
  repoCount: number;
  commitCount: number;
  starCount: number;
  languages: { name: string; bytes: number; share: number }[];
  commitsByMonth: { month: string; count: number }[];
}
export const syncGithub = () =>
  apiPost<{ login: string; repos: number; commits: number }>('/api/developer/github/sync');
export const listRepos = () => apiGet<{ repos: RepoRow[] }>('/api/developer/repos');
export const searchCode = (query: string) =>
  apiPost<{ query: string; hits: CodeHit[] }>('/api/developer/code/search', { query });
export const getAnalyzer = () => apiGet<CareerInsights>('/api/developer/analyzer');
