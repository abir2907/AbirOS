import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../../env.js';
import { HttpError } from '../../lib/errors.js';
import type { AuthClaims } from '../../middleware/auth.js';

const TOKEN_TTL = '30d';

/** Verifies the single account's credentials against env and returns a JWT. */
export async function login(username: string, password: string): Promise<string> {
  if (!env.AUTH_PASSWORD_HASH) {
    throw HttpError.notImplemented(
      'Auth is not configured. Run `pnpm setup:password` and set AUTH_PASSWORD_HASH in .env.',
    );
  }
  const userOk = username === env.AUTH_USERNAME;
  const passOk = await bcrypt.compare(password, env.AUTH_PASSWORD_HASH);
  // Always run the compare to avoid trivial username enumeration via timing.
  if (!userOk || !passOk) {
    throw HttpError.unauthorized('Invalid username or password');
  }
  const claims: AuthClaims = { sub: username, username };
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
