import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';
import { EmailSender } from '../src/services/mailer';
import { NotificationHandler } from '../src/services/notificationHandler';

describe('Notification Service', () => {
  const mockPrisma = {
    notificationRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaClient;

  const mockMailer: jest.Mocked<EmailSender> = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends confirmation email and records notification on order.created', async () => {
    const handler = new NotificationHandler(mockPrisma, mockMailer);

    await handler.handleOrderCreated({
      orderId: '12345678-aaaa-bbbb-cccc-123456789012',
      userId: 'user-1',
      customerEmail: 'alice@example.com',
      status: 'PENDING',
      totalAmount: 18,
      items: [
        {
          productId: 'p1',
          pizzaName: 'Pepperoni Feast',
          size: 'LARGE',
          quantity: 1,
          unitPrice: 18,
        },
      ],
      createdAt: '2026-01-01T12:00:00Z',
    });

    expect(mockMailer.sendEmail).toHaveBeenCalledTimes(2);
    expect(mockMailer.sendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: 'alice@example.com',
        subject: expect.stringContaining('#12345678'),
      })
    );
    expect(mockPrisma.notificationRecord.create).toHaveBeenCalledTimes(2);
  });

  it('GET /notifications enforces admin role', async () => {
    const app = createApp(mockPrisma);

    const forbidden = await request(app)
      .get('/notifications')
      .set('x-user-role', 'CUSTOMER');
    expect(forbidden.status).toBe(403);

    (mockPrisma.notificationRecord.findMany as jest.Mock).mockResolvedValue([]);
    const ok = await request(app)
      .get('/notifications')
      .set('x-user-role', 'ADMIN');
    expect(ok.status).toBe(200);
    expect(ok.body.notifications).toEqual([]);
  });
});
