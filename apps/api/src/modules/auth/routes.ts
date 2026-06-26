import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema } from './schemas.js';
import { login, cookieOptions } from './service.js';
import { AUTH_COOKIE, requireAuth } from '../../middleware/auth.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } },
});

export const authRouter: RouterType = Router();

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const token = await login(username, password);
    res.cookie(AUTH_COOKIE, token, cookieOptions());
    res.json({ username });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.auth!.username });
});
