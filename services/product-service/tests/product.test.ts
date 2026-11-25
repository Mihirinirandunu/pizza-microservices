import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';

describe('Product Service', () => {
  const mockPrisma = {
    pizza: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    pizzaVariant: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaClient;

  const app = createApp(mockPrisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /products returns serialized pizzas and numeric prices', async () => {
    (mockPrisma.pizza.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
        name: 'Pepperoni Feast',
        description: 'Classic pepperoni',
        imageUrl: 'https://example.com/p.jpg',
        category: 'Meat',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: [
          { id: 'v2', pizzaId: 'p1', size: 'LARGE', price: '18.00', stock: 8 },
          { id: 'v1', pizzaId: 'p1', size: 'MEDIUM', price: '14.00', stock: 12 },
        ],
      },
    ]);

    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].variants[0].size).toBe('MEDIUM');
    expect(res.body.products[0].variants[0].price).toBe(14);
  });

  it('POST /products blocks non-admin users', async () => {
    const res = await request(app)
      .post('/products')
      .set('x-user-role', 'CUSTOMER')
      .send({});
    expect(res.status).toBe(403);
  });

  it('PATCH /products/:id/stock deducts stock atomically for internal order-service', async () => {
    (mockPrisma.pizzaVariant.findUnique as jest.Mock).mockResolvedValue({
      id: 'v1',
      pizzaId: 'p1',
      size: 'LARGE',
      price: '18.00',
      stock: 8,
      pizza: { name: 'Pepperoni Feast' },
    });
    (mockPrisma.pizzaVariant.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (mockPrisma.pizzaVariant.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: 'v1',
      pizzaId: 'p1',
      size: 'LARGE',
      price: '18.00',
      stock: 6,
    });

    const res = await request(app)
      .patch('/products/p1/stock')
      .set('x-internal-key', 'pizza-internal-service-key-2026')
      .send({ size: 'LARGE', delta: -2 });

    expect(res.status).toBe(200);
    expect(res.body.variant.stock).toBe(6);
  });

  it('PATCH /products/:id/stock returns 409 when stock is insufficient', async () => {
    (mockPrisma.pizzaVariant.findUnique as jest.Mock).mockResolvedValue({
      id: 'v1',
      pizzaId: 'p1',
      size: 'LARGE',
      price: '18.00',
      stock: 1,
      pizza: { name: 'Pepperoni Feast' },
    });
    (mockPrisma.pizzaVariant.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    });

    const res = await request(app)
      .patch('/products/p1/stock')
      .set('x-internal-key', 'pizza-internal-service-key-2026')
      .send({ size: 'LARGE', delta: -5 });

    expect(res.status).toBe(409);
  });
});
