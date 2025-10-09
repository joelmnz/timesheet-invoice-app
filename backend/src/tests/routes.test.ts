import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Route Smoke Tests', () => {
  it('should have POST /api/projects/:id/invoices route', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/projects/1/invoices')
      .send({
        dateInvoiced: '2025-10-09',
        upToDate: '2025-10-09',
      });

    expect(response.status).not.toBe(404);
  });

  it('should have auth routes', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });

    expect([200, 400, 401, 500]).toContain(response.status);
  });

  it('should have settings routes', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/settings');

    expect([200, 401, 500]).toContain(response.status);
  });

  it('should have clients routes', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/clients');

    expect([200, 401, 500]).toContain(response.status);
  });

  it('should have projects routes', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/projects');

    expect([200, 401, 500]).toContain(response.status);
  });
});
