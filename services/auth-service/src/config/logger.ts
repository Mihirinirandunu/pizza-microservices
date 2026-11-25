import pino from 'pino';

export const logger = pino({
  name: 'auth-service',
  level: process.env.LOG_LEVEL ?? 'info',
});
