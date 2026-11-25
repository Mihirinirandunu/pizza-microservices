import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Order, OrderItem, OrderStatus, PrismaClient } from '@prisma/client';
import { ProductClient, PizzaSize } from '../clients/productClient';
import { OrderEventPublisher } from '../events/rabbitmq';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        size: z.enum(['MEDIUM', 'LARGE', 'XL']),
        quantity: z.number().int().positive().max(50),
      })
    )
    .min(1, 'Order must contain at least one item'),
  notes: z.string().max(300).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PREPARING',
    'DELIVERING',
    'COMPLETED',
    'CANCELLED',
  ]),
});

const statusFilterSchema = z
  .enum(['PENDING', 'PREPARING', 'DELIVERING', 'COMPLETED', 'CANCELLED'])
  .optional();

type OrderWithItems = Order & { items: OrderItem[] };

function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    userId: order.userId,
    customerEmail: order.customerEmail,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      pizzaName: item.pizzaName,
      size: item.size,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  };
}

function requireUser(req: Request): { userId: string; email: string } {
  const userId = req.header('x-user-id');
  const email = req.header('x-user-email');
  if (!userId || !email) {
    throw new AppError(401, 'Authenticated user identity required');
  }
  return { userId, email };
}

function requireAdmin(req: Request): void {
  if (req.header('x-user-role') !== 'ADMIN') {
    throw new AppError(403, 'Admin privileges required');
  }
}

interface NormalizedLine {
  productId: string;
  size: PizzaSize;
  quantity: number;
}

function mergeDuplicateItems(items: NormalizedLine[]): NormalizedLine[] {
  const grouped = new Map<string, NormalizedLine>();
  for (const item of items) {
    const key = `${item.productId}:${item.size}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      grouped.set(key, { ...item });
    }
  }
  return Array.from(grouped.values());
}

export function createOrderRouter(
  prisma: PrismaClient,
  productClient: ProductClient,
  publisher: OrderEventPublisher
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, email } = requireUser(req);
      const input = createOrderSchema.parse(req.body);
      const requestedLines = mergeDuplicateItems(input.items);

      // Step 1: Synchronously validate menu availability and stock with Product Service
      const preparedItems: Array<{
        productId: string;
        pizzaName: string;
        size: PizzaSize;
        quantity: number;
        unitPrice: number;
      }> = [];

      for (const line of requestedLines) {
        const product = await productClient.getProduct(line.productId);
        if (!product.isActive) {
          throw new AppError(400, `${product.name} is currently unavailable`);
        }

        const variant = product.variants.find((v) => v.size === line.size);
        if (!variant) {
          throw new AppError(
            400,
            `${product.name} is not available in size ${line.size}`
          );
        }

        if (variant.stock < line.quantity) {
          throw new AppError(
            409,
            `Insufficient stock for ${product.name} (${line.size}): requested ${line.quantity}, remaining ${variant.stock}`
          );
        }

        preparedItems.push({
          productId: product.id,
          pizzaName: product.name,
          size: line.size,
          quantity: line.quantity,
          unitPrice: Number(variant.price),
        });
      }

      // Step 2: Approach A - Synchronously deduct stock, compensating on failure
      const deducted: Array<{
        productId: string;
        size: PizzaSize;
        quantity: number;
      }> = [];

      let createdOrder: OrderWithItems;
      try {
        for (const item of preparedItems) {
          await productClient.adjustStock(
            item.productId,
            item.size,
            -item.quantity
          );
          deducted.push({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          });
        }

        const totalAmount = preparedItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );

        // Step 3: Persist Order with status PENDING
        createdOrder = await prisma.order.create({
          data: {
            userId,
            customerEmail: email,
            status: OrderStatus.PENDING,
            totalAmount,
            notes: input.notes?.trim() || null,
            items: {
              create: preparedItems,
            },
          },
          include: { items: true },
        });
      } catch (err) {
        // Compensate previously deducted stock
        for (const item of deducted) {
          try {
            await productClient.adjustStock(
              item.productId,
              item.size,
              item.quantity
            );
          } catch (compErr) {
            logger.error(
              { compErr, item },
              'Failed to compensate stock deduction'
            );
          }
        }
        throw err;
      }

      // Step 4: Publish order.created event asynchronously to RabbitMQ
      const serialized = serializeOrder(createdOrder);
      await publisher.publishOrderCreated({
        orderId: serialized.id,
        userId: serialized.userId,
        customerEmail: serialized.customerEmail,
        status: serialized.status,
        totalAmount: serialized.totalAmount,
        items: serialized.items.map((i) => ({
          productId: i.productId,
          pizzaName: i.pizzaName,
          size: i.size,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        createdAt: serialized.createdAt.toISOString(),
      });

      res.status(201).json({
        message: 'Order submitted',
        order: serialized,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/my', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = requireUser(req);
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ orders: orders.map(serializeOrder) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireAdmin(req);
      const statusParam = statusFilterSchema.parse(
        typeof req.query.status === 'string' && req.query.status.length > 0
          ? req.query.status
          : undefined
      );

      const orders = await prisma.order.findMany({
        where: statusParam ? { status: statusParam } : undefined,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ orders: orders.map(serializeOrder) });
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/:id/status',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        requireAdmin(req);
        const id = String(req.params.id);
        const { status } = updateStatusSchema.parse(req.body);

        const existing = await prisma.order.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!existing) {
          throw new AppError(404, 'Order not found');
        }

        const updated = await prisma.order.update({
          where: { id },
          data: { status },
          include: { items: true },
        });

        const serialized = serializeOrder(updated);
        if (existing.status !== status) {
          await publisher.publishOrderStatusUpdated({
            orderId: serialized.id,
            userId: serialized.userId,
            customerEmail: serialized.customerEmail,
            previousStatus: existing.status,
            status: serialized.status,
            totalAmount: serialized.totalAmount,
            items: serialized.items.map((i) => ({
              productId: i.productId,
              pizzaName: i.pizzaName,
              size: i.size,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
            updatedAt: serialized.updatedAt.toISOString(),
          });
        }

        res.json({ order: serialized });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
