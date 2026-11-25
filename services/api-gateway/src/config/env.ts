import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 8000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'pizza-shop-super-secret-jwt-key-2026',
  corsOrigins: (
    process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
  productServiceUrl:
    process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:4002',
  orderServiceUrl: process.env.ORDER_SERVICE_URL ?? 'http://localhost:4003',
  notificationServiceUrl:
    process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4004',
};
