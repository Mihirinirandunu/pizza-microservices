import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';
import { ProductClient } from '../src/clients/productClient';
import { OrderEventPublisher } from '../src/events/rabbitmq';

describe('Order Service', () => {
  const mockPrisma = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaClient;

  const mockProductClient: jest.Mocked<ProductClient> = {
    getProduct: jest.fn(),
    adjustStock: jest.fn(),
  };

  const mockPublisher: jest.Mocked<OrderEventPublisher> = {
    publishOrderCreated: jest.fn().mockResolvedValue(undefined),
    publishOrderStatusUpdated: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const app = createApp({
    prisma: mockPrisma,
    productClient: mockProductClient,
    publisher: mockPublisher,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /orders validates stock, deducts inventory, creates order, and publishes order.created', async () => {
    mockProductClient.getProduct.mockResolvedValue({
      id: 'pizza-1',
      name: 'Pepperoni Feast',
      description: 'Pepperoni',
      isActive: true,
      variants: [
        { id: 'v1', pizzaId: 'pizza-1', size: 'LARGE', price: 18, stock: 8 },
      ],
    });
    mockProductClient.adjustStock.mockResolvedValue({
      id: 'v1',
      pizzaId: 'pizza-1',
      size: 'LARGE',
      price: 18,
      stock: 6,
    });
    (mockPrisma.order.create as jest.Mock).mockResolvedValue({
      id: 'order-123',
      userId: 'user-1',
      customerEmail: 'alice@example.com',
      status: 'PENDING',
      totalAmount: '36.00',
      notes: null,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      updatedAt: new Date('2026-01-01T12:00:00Z'),
      items: [
        {
          id: 'item-1',
          orderId: 'order-123',
          productId: 'pizza-1',
          pizzaName: 'Pepperoni Feast',
          size: 'LARGE',
          quantity: 2,
          unitPrice: '18.00',
        },
      ],
    });

    const res = await request(app)
      .post('/orders')
      .set('x-user-id', 'user-1')
      .set('x-user-email', 'alice@example.com')
      .send({
        items: [{ productId: 'pizza-1', size: 'LARGE', quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Order submitted');
    expect(res.body.order.totalAmount).toBe(36);
    expect(mockProductClient.adjustStock).toHaveBeenCalledWith(
      'pizza-1',
      'LARGE',
      -2
    );
    expect(mockPublisher.publishOrderCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-123',
        customerEmail: 'alice@example.com',
      })
    );
  });

  it('POST /orders rejects insufficient stock without deducting or creating order', async () => {
    mockProductClient.getProduct.mockResolvedValue({
      id: 'pizza-1',
      name: 'Pepperoni Feast',
      description: 'Pepperoni',
      isActive: true,
      variants: [
        { id: 'v1', pizzaId: 'pizza-1', size: 'LARGE', price: 18, stock: 1 },
      ],
    });

    const res = await request(app)
      .post('/orders')
      .set('x-user-id', 'user-1')
      .set('x-user-email', 'alice@example.com')
      .send({
        items: [{ productId: 'pizza-1', size: 'LARGE', quantity: 3 }],
      });

    expect(res.status).toBe(409);
    expect(mockProductClient.adjustStock).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  it('PATCH /orders/:id/status updates status and publishes order.status.updated', async () => {
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-123',
      userId: 'user-1',
      customerEmail: 'alice@example.com',
      status: 'PENDING',
      totalAmount: '18.00',
      notes: null,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      updatedAt: new Date('2026-01-01T12:00:00Z'),
      items: [],
    });
    (mockPrisma.order.update as jest.Mock).mockResolvedValue({
      id: 'order-123',
      userId: 'user-1',
      customerEmail: 'alice@example.com',
      status: 'PREPARING',
      totalAmount: '18.00',
      notes: null,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      updatedAt: new Date('2026-01-01T12:05:00Z'),
      items: [],
    });

    const res = await request(app)
      .patch('/orders/order-123/status')
      .set('x-user-role', 'ADMIN')
      .send({ status: 'PREPARING' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('PREPARING');
    expect(mockPublisher.publishOrderStatusUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-123',
        previousStatus: 'PENDING',
        status: 'PREPARING',
      })
    );
  });
});
