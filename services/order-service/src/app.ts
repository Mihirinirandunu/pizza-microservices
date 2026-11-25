import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import { logger } from './config/logger';
import { prisma as defaultPrisma } from './config/prisma';
import { orderSwaggerDocument } from './config/swagger';
import { HttpProductClient, ProductClient } from './clients/productClient';
import { OrderEventPublisher, RabbitMQPublisher } from './events/rabbitmq';
import { createOrderRouter } from './routes/order.routes';
import { errorHandler } from './middleware/errorHandler';

export interface OrderAppDependencies {
  prisma?: PrismaClient;
  productClient?: ProductClient;
  publisher?: OrderEventPublisher;
}

export function createApp(deps: OrderAppDependencies = {}): Express {
  const prismaClient = deps.prisma ?? defaultPrisma;
  const productClient = deps.productClient ?? new HttpProductClient();
  const publisher = deps.publisher ?? new RabbitMQPublisher();

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'order-service' });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(orderSwaggerDocument));
  app.use('/orders', createOrderRouter(prismaClient, productClient, publisher));

  app.use(errorHandler);
  return app;
}
