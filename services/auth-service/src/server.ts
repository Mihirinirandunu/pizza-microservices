import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

const app = createApp(prisma);

const server = app.listen(env.port, () => {
  logger.info(`auth-service listening on port ${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down auth-service');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
