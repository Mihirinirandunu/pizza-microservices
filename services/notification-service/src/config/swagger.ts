export const notificationSwaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pizza Shop - Notification Service',
    version: '1.0.0',
    description:
      'Consumes RabbitMQ order events, sends emails via Mailtrap/Nodemailer, and stores audit logs.',
  },
  paths: {
    '/notifications': {
      get: {
        summary: 'List all notification records (Admin)',
        responses: { '200': { description: 'Notification records' } },
      },
    },
    '/notifications/my': {
      get: {
        summary: 'List notification records for current customer email',
        responses: { '200': { description: 'Customer notification records' } },
      },
    },
  },
};
