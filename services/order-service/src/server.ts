import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { RabbitMQPublisher } from './events/rabbitmq';

const publisher = new RabbitMQPublisher();
const app = createApp({ prisma, publisher });

async function bootstrap(): Promise<void> {
  await publisher.connect().catch((err) => {
    logger.warn(
      { err },
      'RabbitMQ not ready at startup; will retry on publish'
    );
  });

  const server = app.listen(env.port, () => {
    logger.info(`order-service listening on port ${env.port}`);
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down order-service');
    server.close(async () => {
      await publisher.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
