import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { RabbitMQConsumer } from './events/consumer';
import { NodemailerSender } from './services/mailer';
import { NotificationHandler } from './services/notificationHandler';

const app = createApp(prisma);
const mailer = new NodemailerSender();
const handler = new NotificationHandler(prisma, mailer);
const consumer = new RabbitMQConsumer(handler);

async function bootstrap(): Promise<void> {
  consumer.start().catch((err) => {
    logger.error({ err }, 'RabbitMQ consumer failed to start');
  });

  const server = app.listen(env.port, () => {
    logger.info(`notification-service listening on port ${env.port}`);
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutting down notification-service');
    server.close(async () => {
      await consumer.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
