import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

export function createNotificationRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.header('x-user-role') !== 'ADMIN') {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
      }

      const records = await prisma.notificationRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.json({ notifications: records });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/my',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const email = req.header('x-user-email');
        if (!email) {
          res.status(401).json({ error: 'Authenticated user required' });
          return;
        }

        const records = await prisma.notificationRecord.findMany({
          where: { recipient: email },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        res.json({ notifications: records });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
