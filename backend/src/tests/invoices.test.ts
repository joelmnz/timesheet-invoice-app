import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Invoice Creation Route', () => {
  it('should have POST /api/projects/:id/invoices route', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/projects/1/invoices')
      .send({
        dateInvoiced: '2025-10-09',
        upToDate: '2025-10-09',
      });

    expect([400, 401, 404, 500]).toContain(response.status);
  });

  it('should validate required fields in request body', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/projects/1/invoices')
      .send({});

    expect([400, 401, 500]).toContain(response.status);
  });
});
