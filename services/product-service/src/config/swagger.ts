export const productSwaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pizza Shop - Product Service',
    version: '1.0.0',
    description: 'Pizza menu, size variants, pricing, and inventory stock control.',
  },
  paths: {
    '/products': {
      get: {
        summary: 'List pizzas with size variants and stock',
        responses: { '200': { description: 'Array of pizzas' } },
      },
      post: {
        summary: 'Create a pizza with size variants (Admin)',
        responses: { '201': { description: 'Pizza created' } },
      },
    },
    '/products/{id}': {
      get: {
        summary: 'Get pizza details by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Pizza details' },
          '404': { description: 'Pizza not found' },
        },
      },
      patch: {
        summary: 'Update pizza details or variants (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Pizza updated' } },
      },
      delete: {
        summary: 'Delete a pizza (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '204': { description: 'Deleted' } },
      },
    },
    '/products/{id}/stock': {
      patch: {
        summary: 'Atomically adjust or set stock for a pizza size variant',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Updated variant stock' },
          '409': { description: 'Insufficient stock' },
        },
      },
    },
  },
};
