import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'pizza-shop-super-secret-jwt-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
};
