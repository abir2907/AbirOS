import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { Express } from 'express';

// Configure single-user auth via env BEFORE importing the app (env.ts reads at load).
let app: Express;
beforeAll(async () => {
  process.env.AUTH_USERNAME = 'tester';
  process.env.AUTH_PASSWORD_HASH = bcrypt.hashSync('secret123', 10);
  process.env.JWT_SECRET = 'test_secret_value';
  const mod = await import('../app.js');
  app = mod.createApp();
});

describe('auth flow', () => {
  it('rejects wrong credentials with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'tester', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('logs in with correct credentials and sets an httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'tester' });
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('abiros_token=');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('blocks /me without a session and allows it with one', async () => {
    const noAuth = await request(app).get('/api/auth/me');
    expect(noAuth.status).toBe(401);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'secret123' });
    const cookie = login.headers['set-cookie'] ?? '';

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.username).toBe('tester');
  });

  it('protects ingestion routes', async () => {
    const res = await request(app).post('/api/ingest/note').send({ title: 'x', content: 'y' });
    expect(res.status).toBe(401);
  });
});
