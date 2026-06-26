import type { ApiError, Health } from '@abiros/shared';

/**
 * Thin typed fetch wrapper. In dev, requests are relative and Vite proxies them
 * to the Express API (single origin, cookies included). `credentials: 'include'`
 * carries the auth cookie once login lands in Phase 1.
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
  if (res.ok) return (await res.json()) as T;
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
  const res = await fetch(path, { credentials: 'include' });
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}

export const getHealth = () => apiGet<Health>('/health');
