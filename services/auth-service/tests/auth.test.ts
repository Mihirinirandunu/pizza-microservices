import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';

describe('Auth Service', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaClient;

  const app = createApp(mockPrisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'auth-service' });
  });

  it('POST /auth/register registers a customer and returns JWT', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'CUSTOMER',
      passwordHash: 'hashed',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
      name: 'Alice',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user.role).toBe('CUSTOMER');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(typeof res.body.token).toBe('string');
  });

  it('POST /auth/register rejects duplicate email with 409', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing',
    });

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'password123',
      name: 'Alice',
    });

    expect(res.status).toBe(409);
  });

  it('POST /auth/login validates password and issues JWT', async () => {
    const passwordHash = await bcrypt.hash('secret123', 4);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'owner@pizzashop.local',
      name: 'Mario',
      role: 'ADMIN',
      passwordHash,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await request(app).post('/auth/login').send({
      email: 'owner@pizzashop.local',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN');
    expect(typeof res.body.token).toBe('string');
  });

  it('POST /auth/login rejects invalid credentials with 401', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post('/auth/login').send({
      email: 'nobody@example.com',
      password: 'wrong',
    });

    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns user from x-user-id header', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      role: 'CUSTOMER',
      passwordHash: 'hashed',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    const res = await request(app)
      .get('/auth/me')
      .set('x-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-1');
  });
});
