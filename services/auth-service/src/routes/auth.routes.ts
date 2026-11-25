import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

interface JwtPayload {
  sub: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  name: string;
}

function signToken(user: {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  name: string;
}): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.post(
    '/register',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = registerSchema.parse(req.body);
        const normalizedEmail = input.email.toLowerCase().trim();

        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new AppError(409, 'Email is already registered');
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: input.name.trim(),
            passwordHash,
            role: 'CUSTOMER',
          },
        });

        const token = signToken(user);
        res.status(201).json({
          user: sanitizeUser(user),
          token,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/login',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = loginSchema.parse(req.body);
        const normalizedEmail = input.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) {
          throw new AppError(401, 'Invalid email or password');
        }

        const passwordMatch = await bcrypt.compare(
          input.password,
          user.passwordHash
        );
        if (!passwordMatch) {
          throw new AppError(401, 'Invalid email or password');
        }

        const token = signToken(user);
        res.json({
          user: sanitizeUser(user),
          token,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userId = req.header('x-user-id');

      if (!userId) {
        const authHeader = req.header('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);
          const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
          userId = decoded.sub;
        }
      }

      if (!userId) {
        throw new AppError(401, 'Unauthorized');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      res.json({ user: sanitizeUser(user) });
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        next(new AppError(401, 'Invalid or expired token'));
        return;
      }
      next(err);
    }
  });

  return router;
}
