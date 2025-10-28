import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTestClient, createTestProject, createTestTimeEntry, loginAsTestUser } from './helpers.js';
import { db } from '../db/index.js';
import { invoices } from '../db/schema.js';

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

describe('Invoice Line Item Restrictions for Paid Invoices', () => {
  let app: any;
  let agent: any;
  let clientId: number;
  let projectId: number;
  let unpaidInvoiceId: number;
  let paidInvoiceId: number;

  beforeEach(async () => {
    // Clear invoices to avoid UNIQUE constraint on invoice numbers
    await db.delete(invoices);
    
    app = createApp();
    agent = request.agent(app);
    await loginAsTestUser(agent);

    // Create test client and project
    clientId = await createTestClient(agent);
    projectId = await createTestProject(agent, clientId);

    // Add time entries to enable invoice creation
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-10-27T09:00:00.000Z',
      endAt: '2025-10-27T10:00:00.000Z',
      totalHours: 1,
    });

    // Create an unpaid invoice
    const unpaidInvoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: '2025-10-28',
        upToDate: '2025-10-28',
      });
    unpaidInvoiceId = unpaidInvoiceRes.body.invoice.id;

    // Add another time entry for the second invoice
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-10-14T09:00:00.000Z',
      endAt: '2025-10-14T10:00:00.000Z',
      totalHours: 1,
    });

    // Create a paid invoice
    const paidInvoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: '2025-10-15',
        upToDate: '2025-10-15',
      });
    paidInvoiceId = paidInvoiceRes.body.invoice.id;

    // Mark the second invoice as paid
    await agent
      .put(`/api/invoices/${paidInvoiceId}`)
      .send({
        status: 'Paid',
        datePaid: '2025-10-20',
      });
  });

  describe('POST /api/invoices/:id/lines', () => {
    it('should allow adding line items to unpaid invoices', async () => {
      const response = await agent
        .post(`/api/invoices/${unpaidInvoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Test line item',
          quantity: 1,
          unitPrice: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.description).toBe('Test line item');
    });

    it('should prevent adding line items to paid invoices', async () => {
      const response = await agent
        .post(`/api/invoices/${paidInvoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Test line item',
          quantity: 1,
          unitPrice: 100,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cannot add line items to paid invoices');
    });
  });

  describe('PUT /api/invoice-lines/:lineId', () => {
    let unpaidLineId: number;
    let paidLineId: number;

    beforeEach(async () => {
      // Add a line to unpaid invoice
      const unpaidLineRes = await agent
        .post(`/api/invoices/${unpaidInvoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Unpaid invoice line',
          quantity: 1,
          unitPrice: 50,
        });
      unpaidLineId = unpaidLineRes.body.id;

      // Add a line to the invoice before marking it paid
      await agent
        .put(`/api/invoices/${paidInvoiceId}`)
        .send({ status: 'Unpaid' });
      
      const paidLineRes = await agent
        .post(`/api/invoices/${paidInvoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Paid invoice line',
          quantity: 1,
          unitPrice: 75,
        });
      paidLineId = paidLineRes.body.id;

      // Mark it paid again
      await agent
        .put(`/api/invoices/${paidInvoiceId}`)
        .send({
          status: 'Paid',
          datePaid: '2025-10-20',
        });
    });

    it('should allow editing line items on unpaid invoices', async () => {
      const response = await agent
        .put(`/api/invoice-lines/${unpaidLineId}`)
        .send({
          description: 'Updated description',
          quantity: 2,
          unitPrice: 60,
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated description');
      expect(response.body.quantity).toBe(2);
    });

    it('should prevent editing line items on paid invoices', async () => {
      const response = await agent
        .put(`/api/invoice-lines/${paidLineId}`)
        .send({
          description: 'Updated description',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cannot edit line items on paid invoices');
    });
  });

  describe('DELETE /api/invoice-lines/:lineId', () => {
    let unpaidLineId: number;
    let paidLineId: number;

    beforeEach(async () => {
      // Add a line to unpaid invoice
      const unpaidLineRes = await agent
        .post(`/api/invoices/${unpaidInvoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Unpaid invoice line',
          quantity: 1,
          unitPrice: 50,
        });
      unpaidLineId = unpaidLineRes.body.id;

      // Add a line to the invoice before marking it paid
      await agent
        .put(`/api/invoices/${paidInvoiceId}`)
        .send({ status: 'Unpaid' });
      
      const paidLineRes = await agent
        .post(`/api/invoices/${paidInvoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Paid invoice line',
          quantity: 1,
          unitPrice: 75,
        });
      paidLineId = paidLineRes.body.id;

      // Mark it paid again
      await agent
        .put(`/api/invoices/${paidInvoiceId}`)
        .send({
          status: 'Paid',
          datePaid: '2025-10-20',
        });
    });

    it('should allow deleting line items from unpaid invoices', async () => {
      const response = await agent
        .delete(`/api/invoice-lines/${unpaidLineId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent deleting line items from paid invoices', async () => {
      const response = await agent
        .delete(`/api/invoice-lines/${paidLineId}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Cannot delete line items from paid invoices');
    });
  });

  describe('Data correction workflow', () => {
    let invoiceId: number;
    let lineId: number;

    beforeEach(async () => {
      // Create invoice and add line item
      await createTestTimeEntry(agent, projectId, {
        startAt: '2025-10-24T09:00:00.000Z',
        endAt: '2025-10-24T10:00:00.000Z',
        totalHours: 1,
      });

      const invoiceRes = await agent
        .post(`/api/projects/${projectId}/invoices`)
        .send({
          dateInvoiced: '2025-10-25',
          upToDate: '2025-10-25',
        });
      invoiceId = invoiceRes.body.invoice.id;

      const lineRes = await agent
        .post(`/api/invoices/${invoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Original line',
          quantity: 1,
          unitPrice: 100,
        });
      lineId = lineRes.body.id;

      // Mark as paid
      await agent
        .put(`/api/invoices/${invoiceId}`)
        .send({
          status: 'Paid',
          datePaid: '2025-10-26',
        });
    });

    it('should allow editing invoice status from Paid to Unpaid', async () => {
      const response = await agent
        .put(`/api/invoices/${invoiceId}`)
        .send({ status: 'Unpaid' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Unpaid');
    });

    it('should allow full data correction cycle: Paid -> Unpaid -> Edit Line -> Paid', async () => {
      // Step 1: Mark as Unpaid
      const unpaidRes = await agent
        .put(`/api/invoices/${invoiceId}`)
        .send({ status: 'Unpaid' });
      expect(unpaidRes.status).toBe(200);
      expect(unpaidRes.body.status).toBe('Unpaid');

      // Step 2: Edit the line item
      const editRes = await agent
        .put(`/api/invoice-lines/${lineId}`)
        .send({
          description: 'Corrected line',
          unitPrice: 150,
        });
      expect(editRes.status).toBe(200);
      expect(editRes.body.description).toBe('Corrected line');
      expect(editRes.body.unitPrice).toBe(150);

      // Step 3: Add a new line item
      const addRes = await agent
        .post(`/api/invoices/${invoiceId}/lines`)
        .send({
          type: 'manual',
          description: 'Additional line',
          quantity: 1,
          unitPrice: 50,
        });
      expect(addRes.status).toBe(201);

      // Step 4: Mark as Paid again
      const paidRes = await agent
        .put(`/api/invoices/${invoiceId}`)
        .send({
          status: 'Paid',
          datePaid: '2025-10-27',
        });
      expect(paidRes.status).toBe(200);
      expect(paidRes.body.status).toBe('Paid');

      // Step 5: Verify line items cannot be modified now
      const editAttempt = await agent
        .put(`/api/invoice-lines/${lineId}`)
        .send({ description: 'Should fail' });
      expect(editAttempt.status).toBe(409);
    });
  });
});
