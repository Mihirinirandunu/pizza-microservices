import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';

describe('API Gateway', () => {
  let mockOrderServer: http.Server;
  let mockOrderPort: number;
  let capturedHeaders: Record<string, string | string[] | undefined> = {};

  beforeAll((done) => {
    const mockOrderApp = express();
    mockOrderApp.use(express.json());
    mockOrderApp.get('/orders/my', (req, res) => {
      capturedHeaders = req.headers;
      res.json({ orders: [], userId: req.header('x-user-id') });
    });
    mockOrderApp.patch('/orders/:id/status', (req, res) => {
      res.json({ status: req.body.status });
    });

    mockOrderServer = mockOrderApp.listen(0, () => {
      const addr = mockOrderServer.address();
      if (addr && typeof addr === 'object') {
        mockOrderPort = addr.port;
      }
      done();
    });
  });

  afterAll((done) => {
    mockOrderServer.close(done);
  });

  it('GET /health returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'api-gateway' });
  });

  it('rejects unauthenticated requests to /orders/my with 401', async () => {
    const app = createApp({
      orderServiceUrl: `http://127.0.0.1:${mockOrderPort}`,
    });
    const res = await request(app).get('/orders/my');
    expect(res.status).toBe(401);
  });

  it('validates JWT, strips spoofed headers, and forwards trusted identity to Order Service', async () => {
    const app = createApp({
      orderServiceUrl: `http://127.0.0.1:${mockOrderPort}`,
    });

    const token = jwt.sign(
      { sub: 'cust-42', email: 'alice@example.com', role: 'CUSTOMER' },
      env.jwtSecret
    );

    const res = await request(app)
      .get('/orders/my')
      .set('Authorization', `Bearer ${token}`)
      .set('x-user-role', 'ADMIN');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('cust-42');
    expect(capturedHeaders['x-user-role']).toBe('CUSTOMER');
    expect(capturedHeaders['x-user-email']).toBe('alice@example.com');
  });

  it('blocks CUSTOMER from PATCH /orders/:id/status with 403', async () => {
    const app = createApp({
      orderServiceUrl: `http://127.0.0.1:${mockOrderPort}`,
    });

    const token = jwt.sign(
      { sub: 'cust-42', email: 'alice@example.com', role: 'CUSTOMER' },
      env.jwtSecret
    );

    const res = await request(app)
      .patch('/orders/o1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PREPARING' });

    expect(res.status).toBe(403);
  });
});
