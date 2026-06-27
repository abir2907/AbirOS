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

  it('mounts not-yet-built modules as scaffolded stubs', async () => {
    const res = await request(app).get('/api/life');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ module: 'life', status: 'scaffolded' });
  });

  it('protects real modules with auth', async () => {
    for (const path of [
      '/api/search',
      '/api/developer/repos',
      '/api/projects',
      '/api/tags',
      '/api/learning/flashcards/due',
      '/api/learning/gaps',
      '/api/knowledge/graph',
      '/api/planner/today',
      '/api/planner/goals',
      '/api/planner/courses',
    ]) {
      const res = await request(app).get(path);
      expect(res.status, `${path} should require auth`).toBe(401);
    }
  });

  it('404s unknown routes with the canonical error shape', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
