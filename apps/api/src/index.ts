import { createApp } from './app.js';
import { env, configWarnings } from './env.js';
import { logger } from './lib/logger.js';
import { startJobs, stopJobs } from './jobs/index.js';

async function main() {
  const app = createApp();

  for (const w of configWarnings()) logger.warn(w);

  await startJobs();

  const server = app.listen(env.API_PORT, () => {
    logger.info(`AbirOS API listening on http://localhost:${env.API_PORT}`);
    logger.info(`Health:  http://localhost:${env.API_PORT}/health`);
    logger.info(`CORS origin: ${env.APP_BASE_URL}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down…`);
    await stopJobs();
    server.close(() => process.exit(0));
    // Force-exit if connections linger.
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start API');
  process.exit(1);
});
