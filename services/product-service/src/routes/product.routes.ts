import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Pizza, PizzaSize, PizzaVariant, PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const sizeEnum = z.enum(['MEDIUM', 'LARGE', 'XL']);

const variantInputSchema = z.object({
  size: sizeEnum,
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

const createPizzaSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(5).max(500),
  imageUrl: z.string().url().optional().default(
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80'
  ),
  category: z.string().min(2).max(50).optional().default('Classic'),
  isActive: z.boolean().optional().default(true),
  variants: z.array(variantInputSchema).min(1),
});

const updatePizzaSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().min(5).max(500).optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().min(2).max(50).optional(),
  isActive: z.boolean().optional(),
  variants: z.array(variantInputSchema).optional(),
});

const updateStockSchema = z
  .object({
    size: sizeEnum,
    delta: z.number().int().optional(),
    stock: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => data.delta !== undefined || data.stock !== undefined,
    'Either delta or stock must be provided'
  );

type PizzaWithVariants = Pizza & { variants: PizzaVariant[] };

const SIZE_ORDER: Record<PizzaSize, number> = {
  MEDIUM: 0,
  LARGE: 1,
  XL: 2,
};

function serializePizza(pizza: PizzaWithVariants) {
  return {
    id: pizza.id,
    name: pizza.name,
    description: pizza.description,
    imageUrl: pizza.imageUrl,
    category: pizza.category,
    isActive: pizza.isActive,
    createdAt: pizza.createdAt,
    updatedAt: pizza.updatedAt,
    variants: [...pizza.variants]
      .sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size])
      .map((variant) => ({
        id: variant.id,
        pizzaId: variant.pizzaId,
        size: variant.size,
        price: Number(variant.price),
        stock: variant.stock,
      })),
  };
}

function requireAdmin(req: Request): void {
  if (req.header('x-user-role') !== 'ADMIN') {
    throw new AppError(403, 'Admin privileges required');
  }
}

function requireAdminOrInternal(req: Request): void {
  const isAdmin = req.header('x-user-role') === 'ADMIN';
  const isInternal = req.header('x-internal-key') === env.internalApiKey;
  if (!isAdmin && !isInternal) {
    throw new AppError(403, 'Forbidden');
  }
}

export function createProductRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const pizzas = await prisma.pizza.findMany({
        where: includeInactive ? undefined : { isActive: true },
        include: { variants: true },
        orderBy: { createdAt: 'asc' },
      });

      res.json({ products: pizzas.map(serializePizza) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const pizza = await prisma.pizza.findUnique({
        where: { id },
        include: { variants: true },
      });
      if (!pizza) {
        throw new AppError(404, 'Pizza not found');
      }

      res.json({ product: serializePizza(pizza) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireAdmin(req);
      const input = createPizzaSchema.parse(req.body);

      const existing = await prisma.pizza.findUnique({
        where: { name: input.name.trim() },
      });
      if (existing) {
        throw new AppError(409, 'A pizza with this name already exists');
      }

      const created = await prisma.pizza.create({
        data: {
          name: input.name.trim(),
          description: input.description.trim(),
          imageUrl: input.imageUrl,
          category: input.category,
          isActive: input.isActive,
          variants: {
            create: input.variants.map((v) => ({
              size: v.size,
              price: v.price,
              stock: v.stock,
            })),
          },
        },
        include: { variants: true },
      });

      res.status(201).json({ product: serializePizza(created) });
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        requireAdmin(req);
        const id = String(req.params.id);
        const input = updatePizzaSchema.parse(req.body);

        const existing = await prisma.pizza.findUnique({
          where: { id },
          include: { variants: true },
        });
        if (!existing) {
          throw new AppError(404, 'Pizza not found');
        }

        const updated = await prisma.$transaction(async (tx) => {
          await tx.pizza.update({
            where: { id },
            data: {
              name: input.name?.trim(),
              description: input.description?.trim(),
              imageUrl: input.imageUrl,
              category: input.category,
              isActive: input.isActive,
            },
          });

          if (input.variants) {
            for (const variant of input.variants) {
              await tx.pizzaVariant.upsert({
                where: {
                  pizzaId_size: {
                    pizzaId: id,
                    size: variant.size,
                  },
                },
                update: {
                  price: variant.price,
                  stock: variant.stock,
                },
                create: {
                  pizzaId: id,
                  size: variant.size,
                  price: variant.price,
                  stock: variant.stock,
                },
              });
            }
          }

          return tx.pizza.findUniqueOrThrow({
            where: { id },
            include: { variants: true },
          });
        });

        res.json({ product: serializePizza(updated) });
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete(
    '/:id',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        requireAdmin(req);
        const id = String(req.params.id);
        const existing = await prisma.pizza.findUnique({
          where: { id },
        });
        if (!existing) {
          throw new AppError(404, 'Pizza not found');
        }

        await prisma.pizza.delete({ where: { id } });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  router.patch(
    '/:id/stock',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        requireAdminOrInternal(req);
        const id = String(req.params.id);
        const input = updateStockSchema.parse(req.body);

        const variant = await prisma.pizzaVariant.findUnique({
          where: {
            pizzaId_size: {
              pizzaId: id,
              size: input.size,
            },
          },
          include: { pizza: true },
        });

        if (!variant) {
          throw new AppError(404, 'Pizza size variant not found');
        }

        if (input.stock !== undefined) {
          const updated = await prisma.pizzaVariant.update({
            where: { id: variant.id },
            data: { stock: input.stock },
          });
          res.json({
            variant: {
              id: updated.id,
              pizzaId: updated.pizzaId,
              size: updated.size,
              price: Number(updated.price),
              stock: updated.stock,
            },
          });
          return;
        }

        const delta = input.delta ?? 0;
        if (delta < 0) {
          const deductAmount = Math.abs(delta);
          const result = await prisma.pizzaVariant.updateMany({
            where: {
              id: variant.id,
              stock: { gte: deductAmount },
            },
            data: {
              stock: { decrement: deductAmount },
            },
          });

          if (result.count === 0) {
            throw new AppError(
              409,
              `Insufficient stock for ${variant.pizza.name} (${variant.size})`
            );
          }
        } else if (delta > 0) {
          await prisma.pizzaVariant.update({
            where: { id: variant.id },
            data: { stock: { increment: delta } },
          });
        }

        const refreshed = await prisma.pizzaVariant.findUniqueOrThrow({
          where: { id: variant.id },
        });

        res.json({
          variant: {
            id: refreshed.id,
            pizzaId: refreshed.pizzaId,
            size: refreshed.size,
            price: Number(refreshed.price),
            stock: refreshed.stock,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
