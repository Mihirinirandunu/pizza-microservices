export const authSwaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Pizza Shop - Auth Service',
    version: '1.0.0',
    description: 'User registration, authentication, and JWT issuance.',
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  name: { type: 'string', minLength: 2 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered and JWT issued' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in and obtain a JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated with JWT' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        responses: {
          '200': { description: 'User profile' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
  },
};
