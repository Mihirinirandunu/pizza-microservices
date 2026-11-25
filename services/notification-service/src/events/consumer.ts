import amqplib from 'amqplib';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  NotificationHandler,
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../services/notificationHandler';

const PIZZA_EVENTS_EXCHANGE = 'pizza.events';
const ORDER_CREATED_QUEUE = 'notification.order.created';
const ORDER_STATUS_QUEUE = 'notification.order.status.updated';

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

export class RabbitMQConsumer {
  private connection: AmqpConnection | null = null;
  private channel: amqplib.Channel | null = null;

  constructor(private readonly handler: NotificationHandler) {}

  async start(retries = 15, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const conn = await amqplib.connect(env.rabbitmqUrl);
        const ch = await conn.createChannel();
        await ch.prefetch(10);

        await ch.assertExchange(PIZZA_EVENTS_EXCHANGE, 'topic', {
          durable: true,
        });

        await ch.assertQueue(ORDER_CREATED_QUEUE, { durable: true });
        await ch.bindQueue(
          ORDER_CREATED_QUEUE,
          PIZZA_EVENTS_EXCHANGE,
          'order.created'
        );

        await ch.assertQueue(ORDER_STATUS_QUEUE, { durable: true });
        await ch.bindQueue(
          ORDER_STATUS_QUEUE,
          PIZZA_EVENTS_EXCHANGE,
          'order.status.updated'
        );

        await ch.consume(ORDER_CREATED_QUEUE, async (msg) => {
          if (!msg) return;
          try {
            const payload = JSON.parse(
              msg.content.toString()
            ) as OrderCreatedEvent;
            await this.handler.handleOrderCreated(payload);
            ch.ack(msg);
          } catch (err) {
            logger.error({ err }, 'Error processing order.created message');
            ch.nack(msg, false, !msg.fields.redelivered);
          }
        });

        await ch.consume(ORDER_STATUS_QUEUE, async (msg) => {
          if (!msg) return;
          try {
            const payload = JSON.parse(
              msg.content.toString()
            ) as OrderStatusUpdatedEvent;
            await this.handler.handleOrderStatusUpdated(payload);
            ch.ack(msg);
          } catch (err) {
            logger.error(
              { err },
              'Error processing order.status.updated message'
            );
            ch.nack(msg, false, !msg.fields.redelivered);
          }
        });

        conn.on('close', () => {
          logger.warn('RabbitMQ consumer connection closed');
        });
        conn.on('error', (err) => {
          logger.error({ err }, 'RabbitMQ consumer connection error');
        });

        this.connection = conn;
        this.channel = ch;
        logger.info('Notification RabbitMQ consumer listening on queues');
        return;
      } catch (err) {
        logger.warn(
          { err, attempt, retries },
          'Waiting for RabbitMQ consumer connection...'
        );
        if (attempt === retries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
