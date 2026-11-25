import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4002),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  internalApiKey:
    process.env.INTERNAL_API_KEY ?? 'pizza-internal-service-key-2026',
};
