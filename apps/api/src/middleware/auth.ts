import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { HttpError } from '../lib/errors.js';

export interface AuthClaims {
  sub: string;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export const AUTH_COOKIE = 'abiros_token';

/**
 * Verifies the JWT from the httpOnly cookie and attaches claims to req.auth.
 * The login flow that issues this cookie arrives in Phase 1; the verifier is
 * defined now so module routes can adopt it without rewiring.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    next(HttpError.unauthorized());
    return;
  }
  try {
    req.auth = jwt.verify(token, env.JWT_SECRET) as AuthClaims;
    next();
  } catch {
    next(HttpError.unauthorized('Invalid or expired session'));
  }
};
