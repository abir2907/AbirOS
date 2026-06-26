import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  const app = createApp();

  it('returns 200 with a valid health shape', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(['ok', 'degraded', 'error']).toContain(res.body.status);
    expect(res.body.checks).toHaveProperty('db');
    expect(res.body.checks).toHaveProperty('ollama');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });
});

describe('module stubs', () => {
  const app = createApp();

  it('mounts /api/search as a scaffolded stub', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ module: 'search', status: 'scaffolded' });
  });

  it('404s unknown routes with the canonical error shape', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
