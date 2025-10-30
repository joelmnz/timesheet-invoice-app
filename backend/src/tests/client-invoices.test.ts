import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createTestClient, createTestProject, createTestTimeEntry, createTestExpense, loginAsTestUser } from './helpers.js';
import { db } from '../db/index.js';
import { invoices } from '../db/schema.js';

describe('Client-Level Invoice Creation', () => {
  let app: any;
  let agent: any;
  let clientId: number;
  let project1Id: number;
  let project2Id: number;

  beforeEach(async () => {
    // Clear invoices to avoid UNIQUE constraint on invoice numbers
    await db.delete(invoices);
    
    app = createApp();
    agent = request.agent(app);
    await loginAsTestUser(agent);

    // Create test client
    clientId = await createTestClient(agent);
    
    // Create two projects for the client
    project1Id = await createTestProject(agent, clientId, { name: 'Project 1', hourlyRate: 100 });
    project2Id = await createTestProject(agent, clientId, { name: 'Project 2', hourlyRate: 150 });
  });

  describe('GET /api/clients/:id/uninvoiced-summary', () => {
    it('should return empty list when no uninvoiced items exist', async () => {
      const response = await agent
        .get(`/api/clients/${clientId}/uninvoiced-summary`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);
    });

    it('should return uninvoiced summary for projects with time entries', async () => {
      // Add time entries to both projects
      await createTestTimeEntry(agent, project1Id, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        totalHours: 1,
      });

      await createTestTimeEntry(agent, project2Id, {
        startAt: '2025-10-27T10:00:00.000Z',
        endAt: '2025-10-27T12:00:00.000Z',
        totalHours: 2,
      });

      const response = await agent
        .get(`/api/clients/${clientId}/uninvoiced-summary`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(2);
      
      const proj1Summary = response.body.projects.find((p: any) => p.projectId === project1Id);
      expect(proj1Summary.uninvoicedHours).toBe(1);
      expect(proj1Summary.timeAmount).toBe(100); // 1 hour * $100
      expect(proj1Summary.expenseAmount).toBe(0);
      expect(proj1Summary.totalAmount).toBe(100);

      const proj2Summary = response.body.projects.find((p: any) => p.projectId === project2Id);
      expect(proj2Summary.uninvoicedHours).toBe(2);
      expect(proj2Summary.timeAmount).toBe(300); // 2 hours * $150
      expect(proj2Summary.expenseAmount).toBe(0);
      expect(proj2Summary.totalAmount).toBe(300);
    });

    it('should include expenses in summary', async () => {
      await createTestTimeEntry(agent, project1Id, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        totalHours: 1,
      });

      await createTestExpense(agent, project1Id, {
        expenseDate: '2025-10-27',
        amount: 50,
        description: 'Test expense',
        isBillable: true,
      });

      const response = await agent
        .get(`/api/clients/${clientId}/uninvoiced-summary`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(1);
      
      const proj1Summary = response.body.projects[0];
      expect(proj1Summary.uninvoicedHours).toBe(1);
      expect(proj1Summary.timeAmount).toBe(100);
      expect(proj1Summary.expenseAmount).toBe(50);
      expect(proj1Summary.totalAmount).toBe(150);
    });

    it('should filter by upToDate parameter', async () => {
      // Add time entry before the cutoff
      await createTestTimeEntry(agent, project1Id, {
        startAt: '2025-10-20T09:00:00.000Z',
        endAt: '2025-10-20T10:00:00.000Z',
        totalHours: 1,
      });

      // Add time entry after the cutoff
      await createTestTimeEntry(agent, project1Id, {
        startAt: '2025-10-30T09:00:00.000Z',
        endAt: '2025-10-30T10:00:00.000Z',
        totalHours: 1,
      });

      const response = await agent
        .get(`/api/clients/${clientId}/uninvoiced-summary?upToDate=2025-10-25`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].uninvoicedHours).toBe(1); // Only the first entry
    });

    it('should return 404 for non-existent client', async () => {
      const response = await agent
        .get('/api/clients/99999/uninvoiced-summary');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Client not found');
    });
  });

  describe('POST /api/clients/:id/invoices', () => {
    beforeEach(async () => {
      // Add time entries to both projects
      await createTestTimeEntry(agent, project1Id, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        totalHours: 1,
      });

      await createTestTimeEntry(agent, project2Id, {
        startAt: '2025-10-27T10:00:00.000Z',
        endAt: '2025-10-27T12:00:00.000Z',
        totalHours: 2,
      });

      await createTestExpense(agent, project1Id, {
        expenseDate: '2025-10-27',
        amount: 50,
        description: 'Test expense',
        isBillable: true,
      });
    });

    it('should create invoice for multiple projects', async () => {
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id, project2Id],
        });

      expect(response.status).toBe(201);
      expect(response.body.invoice).toBeDefined();
      expect(response.body.invoice.clientId).toBe(clientId);
      expect(response.body.invoice.status).toBe('Unpaid');
      expect(response.body.lineItems).toBeDefined();
      expect(response.body.lineItems.length).toBeGreaterThan(0);

      // Check that totals are correct
      // Project 1: 1 hour * $100 + $50 expense = $150
      // Project 2: 2 hours * $150 = $300
      // Total: $450
      expect(response.body.invoice.total).toBe(450);
    });

    it('should group line items by project', async () => {
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id, project2Id],
        });

      expect(response.status).toBe(201);
      
      // Check that line items include project names in descriptions
      const lineItems = response.body.lineItems;
      const project1Items = lineItems.filter((item: any) => 
        item.description.includes('Project 1')
      );
      const project2Items = lineItems.filter((item: any) => 
        item.description.includes('Project 2')
      );

      expect(project1Items.length).toBeGreaterThan(0);
      expect(project2Items.length).toBeGreaterThan(0);
    });

    it('should allow creating invoice for single project', async () => {
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id],
        });

      expect(response.status).toBe(201);
      expect(response.body.invoice.total).toBe(150); // 1 hour * $100 + $50 expense
    });

    it('should reject if no projects are selected', async () => {
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject if projects do not belong to client', async () => {
      // Create another client and project
      const otherClientId = await createTestClient(agent, { name: 'Other Client' });
      const otherProjectId = await createTestProject(agent, otherClientId);

      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id, otherProjectId],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('do not belong to this client');
    });

    it('should return error if no uninvoiced items exist', async () => {
      // Create invoice first to mark everything as invoiced
      await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id, project2Id],
        });

      // Try to create another invoice
      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-29',
          upToDate: '2025-10-29',
          projectIds: [project1Id, project2Id],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No uninvoiced');
    });

    it('should respect upToDate filter', async () => {
      // Add a future time entry
      await createTestTimeEntry(agent, project1Id, {
        startAt: '2025-11-01T09:00:00.000Z',
        endAt: '2025-11-01T10:00:00.000Z',
        totalHours: 1,
      });

      const response = await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id, project2Id],
        });

      expect(response.status).toBe(201);
      // Should only invoice items up to 2025-10-28
      // The future entry should not be included
      expect(response.body.invoice.total).toBe(450); // Same as before
    });

    it('should support groupByDay option', async () => {
      // Remove the expense from this test to simplify
      // Create a new client and projects just for this test
      const testClientId = await createTestClient(agent, { name: 'GroupByDay Test Client' });
      const testProject1Id = await createTestProject(agent, testClientId, { name: 'GroupTest Project 1', hourlyRate: 100 });
      
      // Add two time entries on the same day
      await createTestTimeEntry(agent, testProject1Id, {
        startAt: '2025-10-27T09:00:00.000Z',
        endAt: '2025-10-27T10:00:00.000Z',
        totalHours: 1,
      });

      await createTestTimeEntry(agent, testProject1Id, {
        startAt: '2025-10-27T14:00:00.000Z',
        endAt: '2025-10-27T15:00:00.000Z',
        totalHours: 1,
      });

      const response = await agent
        .post(`/api/clients/${testClientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [testProject1Id],
          groupByDay: true,
        });

      expect(response.status).toBe(201);
      
      // With groupByDay, time entries on the same day for the same project should be combined
      const timeLineItems = response.body.lineItems.filter((item: any) => item.type === 'time');
      
      // Should have 1 time line item for the day (2 hours combined)
      expect(timeLineItems.length).toBe(1);
      expect(timeLineItems[0].quantity).toBe(2);
      expect(timeLineItems[0].description).toContain('2025-10-27');
    });

    it('should return 404 for non-existent client', async () => {
      const response = await agent
        .post('/api/clients/99999/invoices')
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id],
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Client not found');
    });

    it('should mark time entries and expenses as invoiced', async () => {
      await agent
        .post(`/api/clients/${clientId}/invoices`)
        .send({
          dateInvoiced: '2025-10-28',
          upToDate: '2025-10-28',
          projectIds: [project1Id, project2Id],
        });

      // Check that uninvoiced summary is now empty
      const summaryResponse = await agent
        .get(`/api/clients/${clientId}/uninvoiced-summary`);

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.projects).toEqual([]);
    });
  });
});
