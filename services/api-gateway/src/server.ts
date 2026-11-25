import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`api-gateway listening on port ${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down api-gateway');
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
