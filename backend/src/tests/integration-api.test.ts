import { beforeAll, describe, expect, test } from 'bun:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createAuthenticatedAgent, ensureTestSettings } from './helpers.js';

describe('Integration API Routes', () => {
  let app: any;
  let agent: ReturnType<typeof request.agent>;
  let apiKey = '';

  beforeAll(async () => {
    ensureTestSettings();
    app = createApp();
    agent = request.agent(app);
    await createAuthenticatedAgent(agent);

    const keyResponse = await agent.post('/api/settings/api-keys/generate').send({ name: 'Integration Test Key' });
    apiKey = keyResponse.body.apiKey;
  });

  test('requires API key for outstanding invoices endpoint', async () => {
    const res = await request(app).get('/api/integration/fetchOutstandingInvoices');
    expect(res.status).toBe(401);
  });

  test('returns outstanding invoices aligned with dashboard summary', async () => {
    const dashboardRes = await agent.get('/api/dashboard/summary');
    expect(dashboardRes.status).toBe(200);

    const integrationRes = await request(app)
      .get('/api/integration/fetchOutstandingInvoices')
      .set('x-api-key', apiKey);

    expect(integrationRes.status).toBe(200);
    expect(integrationRes.body.data).toEqual(dashboardRes.body.outstandingInvoices);
    expect(integrationRes.body.count).toBe(dashboardRes.body.outstandingInvoices.length);
  });

  test('returns uninvoiced items aligned with dashboard summary', async () => {
    const dashboardRes = await agent.get('/api/dashboard/summary');
    expect(dashboardRes.status).toBe(200);

    const integrationRes = await request(app)
      .get('/api/integration/fetchUninvoicedItems')
      .set('authorization', `Bearer ${apiKey}`);

    expect(integrationRes.status).toBe(200);
    expect(integrationRes.body.hours).toEqual(dashboardRes.body.uninvoicedHoursByProject);
    expect(integrationRes.body.expenses).toEqual(dashboardRes.body.uninvoicedExpensesByProject);
  });
});
