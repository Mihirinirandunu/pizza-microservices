import pino from 'pino';

export const logger = pino({
  name: 'product-service',
  level: process.env.LOG_LEVEL ?? 'info',
});
