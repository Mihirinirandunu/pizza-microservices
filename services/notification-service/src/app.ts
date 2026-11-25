import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import { logger } from './config/logger';
import { prisma as defaultPrisma } from './config/prisma';
import { notificationSwaggerDocument } from './config/swagger';
import { createNotificationRouter } from './routes/notification.routes';

export function createApp(prismaClient: PrismaClient = defaultPrisma): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'notification-service' });
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(notificationSwaggerDocument)
  );
  app.use('/notifications', createNotificationRouter(prismaClient));

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      logger.error({ err }, 'Unhandled error in notification-service');
      res.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}
