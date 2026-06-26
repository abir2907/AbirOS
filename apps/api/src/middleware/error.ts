import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@abiros/shared';
import { HttpError } from '../lib/errors.js';
import { env } from '../env.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: 'Route not found' } });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs the 4-arg signature.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION,
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL,
      message: 'Internal server error',
      // Never leak stack traces in production.
      details: env.NODE_ENV === 'production' ? undefined : String(err),
    },
  });
};
