import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  name?: string;
}

function stripTrustedHeaders(req: Request): void {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-email'];
  delete req.headers['x-user-role'];
  delete req.headers['x-internal-key'];
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  stripTrustedHeaders(req);

  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.headers['x-user-id'] = decoded.sub;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function stripHeadersOnly(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  stripTrustedHeaders(req);
  next();
}

export function requireRole(role: 'ADMIN') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.header('x-user-role') !== role) {
      res.status(403).json({ error: 'Admin privileges required' });
      return;
    }
    next();
  };
}
