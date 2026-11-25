import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4003),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  productServiceUrl:
    process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:4002',
  rabbitmqUrl:
    process.env.RABBITMQ_URL ?? 'amqp://pizza:pizza123@localhost:5672',
  internalApiKey:
    process.env.INTERNAL_API_KEY ?? 'pizza-internal-service-key-2026',
};
