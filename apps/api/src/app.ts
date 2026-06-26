import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { mountModules } from './modules/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

/** Builds the Express app without binding a port (so Supertest can import it). */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  // CORS locked to the web origin; credentials on for the auth cookie.
  app.use(cors({ origin: env.APP_BASE_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Public: health check.
  app.use('/', healthRouter);

  // Feature modules under /api.
  app.use('/api', mountModules());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
