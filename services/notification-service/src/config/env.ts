import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4004),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmqUrl:
    process.env.RABBITMQ_URL ?? 'amqp://pizza:pizza123@localhost:5672',
  mailtrapHost: process.env.MAILTRAP_HOST ?? 'sandbox.smtp.mailtrap.io',
  mailtrapPort: Number(process.env.MAILTRAP_PORT ?? 2525),
  mailtrapUser: process.env.MAILTRAP_USER ?? '',
  mailtrapPass: process.env.MAILTRAP_PASS ?? '',
  shopOwnerEmail: process.env.SHOP_OWNER_EMAIL ?? 'owner@pizzashop.local',
  emailFrom: process.env.EMAIL_FROM ?? 'Pizza Shop <no-reply@pizzashop.local>',
};
