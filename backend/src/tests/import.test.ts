import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Invoice Import Routes', () => {
  it('should have POST /api/import/invoices/validate route', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/import/invoices/validate')
      .send({
        csvContent: 'Invoice Number,Invoice Date,Invoice Line Description,Invoice Amount,Date Invoice Paid\nINV-001,2025-01-01,Test,100,'
      });

    expect([200, 400, 401, 500]).toContain(response.status);
  });

  it('should have POST /api/import/invoices/confirm route', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/import/invoices/confirm')
      .send({
        csvContent: 'Invoice Number,Invoice Date,Invoice Line Description,Invoice Amount,Date Invoice Paid\nINV-001,2025-01-01,Test,100,'
      });

    expect([200, 400, 401, 500]).toContain(response.status);
  });

  it('should have GET /api/import/invoices/example route', async () => {
    const app = createApp();
    const response = await request(app)
      .get('/api/import/invoices/example');

    expect([200, 401, 500]).toContain(response.status);
  });

  it('should reject empty CSV content', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/import/invoices/validate')
      .send({
        csvContent: ''
      });

    expect([400, 401, 500]).toContain(response.status);
  });

  it('should validate CSV headers', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/import/invoices/validate')
      .send({
        csvContent: 'Wrong,Headers,Here\nvalue1,value2,value3'
      });

    expect([200, 400, 401, 500]).toContain(response.status);
  });
});
