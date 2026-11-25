import { NotificationStatus, PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { EmailSender } from './mailer';

export interface OrderItemEvent {
  productId: string;
  pizzaName: string;
  size: 'MEDIUM' | 'LARGE' | 'XL';
  quantity: number;
  unitPrice: number;
}

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  items: OrderItemEvent[];
  createdAt: string;
}

export interface OrderStatusUpdatedEvent {
  orderId: string;
  userId: string;
  customerEmail: string;
  previousStatus: string;
  status: string;
  totalAmount: number;
  items: OrderItemEvent[];
  updatedAt: string;
}

function formatItemList(items: OrderItemEvent[]): string {
  return items
    .map((item) => `${item.pizzaName} ${item.size} x${item.quantity}`)
    .join(', ');
}

export class NotificationHandler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mailer: EmailSender
  ) {}

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const shortId = event.orderId.slice(0, 8).toUpperCase();
    const itemsSummary = formatItemList(event.items);
    const logMessage = `New pizza order: Order #${shortId}, ${itemsSummary}`;

    logger.info({ orderId: event.orderId }, logMessage);

    // 1. Send confirmation email to customer
    await this.deliverAndRecord({
      orderId: event.orderId,
      eventType: 'order.created',
      recipient: event.customerEmail,
      subject: `Order Confirmed #${shortId} - Artisan Pizza Shop`,
      text: `Thank you for your order!\n\nOrder #${shortId}\nItems: ${itemsSummary}\nTotal: $${event.totalAmount.toFixed(2)}\nStatus: ${event.status}`,
      html: `<h2>Order Confirmed #${shortId}</h2><p>Items: <strong>${itemsSummary}</strong></p><p>Total: <strong>$${event.totalAmount.toFixed(2)}</strong></p><p>Status: ${event.status}</p>`,
    });

    // 2. Notify shop owner if configured and distinct from customer
    if (
      env.shopOwnerEmail &&
      env.shopOwnerEmail.toLowerCase() !== event.customerEmail.toLowerCase()
    ) {
      await this.deliverAndRecord({
        orderId: event.orderId,
        eventType: 'order.created.owner',
        recipient: env.shopOwnerEmail,
        subject: `[New Order] #${shortId} ($${event.totalAmount.toFixed(2)})`,
        text: `${logMessage}\nCustomer: ${event.customerEmail}\nTotal: $${event.totalAmount.toFixed(2)}`,
        html: `<h3>New Pizza Order #${shortId}</h3><p>${itemsSummary}</p><p>Customer: ${event.customerEmail}</p><p>Total: $${event.totalAmount.toFixed(2)}</p>`,
      });
    }
  }

  async handleOrderStatusUpdated(
    event: OrderStatusUpdatedEvent
  ): Promise<void> {
    const shortId = event.orderId.slice(0, 8).toUpperCase();
    const message = `Order #${shortId} status changed from ${event.previousStatus} to ${event.status}`;
    logger.info({ orderId: event.orderId }, message);

    await this.deliverAndRecord({
      orderId: event.orderId,
      eventType: 'order.status.updated',
      recipient: event.customerEmail,
      subject: `Order #${shortId} is now ${event.status}`,
      text: `${message}\n\nItems: ${formatItemList(event.items)}`,
      html: `<h2>Order #${shortId} Update</h2><p>Your order status is now <strong>${event.status}</strong>.</p><p>Items: ${formatItemList(event.items)}</p>`,
    });
  }

  private async deliverAndRecord(input: {
    orderId: string;
    eventType: string;
    recipient: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    try {
      await this.mailer.sendEmail({
        to: input.recipient,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      await this.prisma.notificationRecord.create({
        data: {
          orderId: input.orderId,
          eventType: input.eventType,
          recipient: input.recipient,
          subject: input.subject,
          message: input.text,
          status: NotificationStatus.SENT,
        },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown email error';
      logger.error(
        { err, orderId: input.orderId, recipient: input.recipient },
        'Failed to deliver notification'
      );

      await this.prisma.notificationRecord.create({
        data: {
          orderId: input.orderId,
          eventType: input.eventType,
          recipient: input.recipient,
          subject: input.subject,
          message: input.text,
          status: NotificationStatus.FAILED,
          errorMessage,
        },
      });
    }
  }
}
