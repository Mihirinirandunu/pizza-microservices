import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { env } from './config/env';
import { logger } from './config/logger';
import { gatewaySwaggerDocument } from './config/swagger';
import {
  authenticate,
  requireRole,
  stripHeadersOnly,
} from './middleware/auth';

export interface GatewayTargets {
  authServiceUrl?: string;
  productServiceUrl?: string;
  orderServiceUrl?: string;
  notificationServiceUrl?: string;
}

export function createApp(targets: GatewayTargets = {}): Express {
  const authUrl = targets.authServiceUrl ?? env.authServiceUrl;
  const productUrl = targets.productServiceUrl ?? env.productServiceUrl;
  const orderUrl = targets.orderServiceUrl ?? env.orderServiceUrl;
  const notificationUrl =
    targets.notificationServiceUrl ?? env.notificationServiceUrl;

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(pinoHttp({ logger }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(gatewaySwaggerDocument));

  // Auth guards before reverse proxies (no global express.json so request bodies stream cleanly)
  app.use('/auth/login', stripHeadersOnly);
  app.use('/auth/register', stripHeadersOnly);
  app.use('/auth/me', authenticate);

  app.use('/products', (req, res, next) => {
    if (req.method === 'GET') {
      stripHeadersOnly(req, res, next);
      return;
    }
    authenticate(req, res, () => requireRole('ADMIN')(req, res, next));
  });

  app.use('/orders', authenticate, (req, res, next) => {
    if (req.path === '/' && req.method === 'GET') {
      requireRole('ADMIN')(req, res, next);
      return;
    }
    if (req.path.endsWith('/status') && req.method === 'PATCH') {
      requireRole('ADMIN')(req, res, next);
      return;
    }
    next();
  });

  app.use('/notifications', authenticate, (req, res, next) => {
    if (req.path === '/my' && req.method === 'GET') {
      next();
      return;
    }
    requireRole('ADMIN')(req, res, next);
  });

  // Reverse proxy routes preserving original path prefixes
  app.use(
    createProxyMiddleware({
      target: authUrl,
      changeOrigin: true,
      pathFilter: '/auth',
    })
  );

  app.use(
    createProxyMiddleware({
      target: productUrl,
      changeOrigin: true,
      pathFilter: '/products',
    })
  );

  app.use(
    createProxyMiddleware({
      target: orderUrl,
      changeOrigin: true,
      pathFilter: '/orders',
    })
  );

  app.use(
    createProxyMiddleware({
      target: notificationUrl,
      changeOrigin: true,
      pathFilter: '/notifications',
    })
  );

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found on API Gateway' });
  });

  return app;
}
