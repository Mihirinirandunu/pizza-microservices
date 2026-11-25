import amqplib from 'amqplib';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const PIZZA_EVENTS_EXCHANGE = 'pizza.events';

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

export interface OrderEventPublisher {
  publishOrderCreated(event: OrderCreatedEvent): Promise<void>;
  publishOrderStatusUpdated(event: OrderStatusUpdatedEvent): Promise<void>;
  close(): Promise<void>;
}

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

export class RabbitMQPublisher implements OrderEventPublisher {
  private connection: AmqpConnection | null = null;
  private channel: amqplib.Channel | null = null;

  async connect(retries = 10, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const conn = await amqplib.connect(env.rabbitmqUrl);
        const ch = await conn.createChannel();
        await ch.assertExchange(PIZZA_EVENTS_EXCHANGE, 'topic', {
          durable: true,
        });

        conn.on('close', () => {
          logger.warn('RabbitMQ connection closed');
          this.connection = null;
          this.channel = null;
        });

        conn.on('error', (err) => {
          logger.error({ err }, 'RabbitMQ connection error');
        });

        this.connection = conn;
        this.channel = ch;
        logger.info('Connected to RabbitMQ exchange');
        return;
      } catch (err) {
        logger.warn(
          { err, attempt, retries },
          'Waiting for RabbitMQ connection...'
        );
        if (attempt === retries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async ensureChannel(): Promise<amqplib.Channel> {
    if (!this.channel) {
      await this.connect(3, 1000);
    }
    if (!this.channel) {
      throw new Error('RabbitMQ channel unavailable');
    }
    return this.channel;
  }

  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.publish('order.created', event);
  }

  async publishOrderStatusUpdated(
    event: OrderStatusUpdatedEvent
  ): Promise<void> {
    await this.publish('order.status.updated', event);
  }

  private async publish(routingKey: string, payload: unknown): Promise<void> {
    try {
      const ch = await this.ensureChannel();
      ch.publish(
        PIZZA_EVENTS_EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json' }
      );
      logger.info({ routingKey }, 'Published RabbitMQ event');
    } catch (err) {
      logger.error({ err, routingKey }, 'Failed to publish RabbitMQ event');
    }
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
