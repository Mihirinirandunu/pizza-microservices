export const gatewaySwaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pizza Shop - API Gateway',
    version: '1.0.0',
    description:
      'Unified entry point handling JWT authentication, role enforcement, and routing across Pizza Shop microservices.',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: { summary: 'Register customer (Public)' },
    },
    '/auth/login': {
      post: { summary: 'Login & obtain JWT (Public)' },
    },
    '/auth/me': {
      get: {
        summary: 'Current user profile (Authenticated)',
        security: [{ bearerAuth: [] }],
      },
    },
    '/products': {
      get: { summary: 'Browse pizza menu & stock (Public/Customer)' },
      post: {
        summary: 'Create pizza (Admin)',
        security: [{ bearerAuth: [] }],
      },
    },
    '/products/{id}/stock': {
      patch: {
        summary: 'Adjust stock (Admin)',
        security: [{ bearerAuth: [] }],
      },
    },
    '/orders': {
      post: {
        summary: 'Place order (Authenticated)',
        security: [{ bearerAuth: [] }],
      },
      get: {
        summary: 'List all orders (Admin)',
        security: [{ bearerAuth: [] }],
      },
    },
    '/orders/my': {
      get: {
        summary: 'View my orders (Authenticated)',
        security: [{ bearerAuth: [] }],
      },
    },
    '/orders/{id}/status': {
      patch: {
        summary: 'Update order status (Admin)',
        security: [{ bearerAuth: [] }],
      },
    },
    '/notifications': {
      get: {
        summary: 'View notification audit logs (Admin)',
        security: [{ bearerAuth: [] }],
      },
    },
  },
};
