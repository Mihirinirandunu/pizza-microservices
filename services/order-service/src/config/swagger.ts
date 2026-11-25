export const orderSwaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pizza Shop - Order Service',
    version: '1.0.0',
    description:
      'Order placement (with synchronous inventory deduction) and status lifecycle events.',
  },
  paths: {
    '/orders': {
      post: {
        summary: 'Place a new pizza order',
        responses: {
          '201': { description: 'Order submitted' },
          '409': { description: 'Insufficient stock' },
        },
      },
      get: {
        summary: 'List all orders (Admin)',
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'Orders list' } },
      },
    },
    '/orders/my': {
      get: {
        summary: 'Get orders belonging to the authenticated customer',
        responses: { '200': { description: 'Customer orders' } },
      },
    },
    '/orders/{id}/status': {
      patch: {
        summary: 'Update order status and emit order.status.updated (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Updated order' } },
      },
    },
  },
};
