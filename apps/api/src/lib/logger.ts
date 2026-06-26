import { pino } from 'pino';
import { env } from '../env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Pretty-print in dev; structured JSON in prod. Never log secrets.
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
});

export type Logger = typeof logger;
