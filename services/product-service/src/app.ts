import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import { logger } from './config/logger';
import { prisma as defaultPrisma } from './config/prisma';
import { productSwaggerDocument } from './config/swagger';
import { createProductRouter } from './routes/product.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(prismaClient: PrismaClient = defaultPrisma): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'product-service' });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(productSwaggerDocument));
  app.use('/products', createProductRouter(prismaClient));

  app.use(errorHandler);
  return app;
}
