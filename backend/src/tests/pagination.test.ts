import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { clients, projects, timeEntries, expenses, invoices } from '../db/schema.js';
import { eq } from 'drizzle-orm';

describe('Pagination and Sorting Tests', () => {
  let app: any;
  let authToken: string;
  let testClientId: number;
  let testProjectId: number;

  beforeAll(async () => {
    app = createApp();

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });

    authToken = loginRes.body.token;

    // Create a test client
    const clientRes = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Client for Pagination',
        defaultHourlyRate: 100,
      });

    testClientId = clientRes.body.id;

    // Create a test project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId: testClientId,
        name: 'Test Project for Pagination',
        hourlyRate: 100,
      });

    testProjectId = projectRes.body.id;

    // Create multiple time entries with different dates
    const timeEntryDates = [
      '2025-01-01T10:00:00Z',
      '2025-01-05T10:00:00Z',
      '2025-01-10T10:00:00Z',
      '2025-01-15T10:00:00Z',
      '2025-01-20T10:00:00Z',
    ];

    for (const startAt of timeEntryDates) {
      await request(app)
        .post(`/api/projects/${testProjectId}/time-entries`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startAt,
          endAt: new Date(new Date(startAt).getTime() + 3600000).toISOString(),
          note: `Entry for ${startAt}`,
        });
    }

    // Create multiple expenses with different dates
    const expenseDates = ['2025-01-02', '2025-01-07', '2025-01-12', '2025-01-17', '2025-01-22'];

    for (const expenseDate of expenseDates) {
      await request(app)
        .post(`/api/projects/${testProjectId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          expenseDate,
          description: `Expense for ${expenseDate}`,
          amount: 50,
          isBillable: true,
        });
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testProjectId) {
      await db.delete(timeEntries).where(eq(timeEntries.projectId, testProjectId));
      await db.delete(expenses).where(eq(expenses.projectId, testProjectId));
      await db.delete(projects).where(eq(projects.id, testProjectId));
    }
    if (testClientId) {
      await db.delete(clients).where(eq(clients.id, testClientId));
    }
  });

  describe('Time Entries Pagination and Sorting', () => {
    it('should return time entries sorted by startAt DESC', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/time-entries`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check DESC order
      for (let i = 0; i < response.body.data.length - 1; i++) {
        const current = new Date(response.body.data[i].startAt).getTime();
        const next = new Date(response.body.data[i + 1].startAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should support pagination with default page_size of 25', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/time-entries`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(25);
      expect(response.body.pagination.page).toBe(1);
    });

    it('should support custom page_size', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/time-entries?page_size=10`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(10);
    });

    it('should support page_size options: 10, 25, 50, 100', async () => {
      for (const pageSize of [10, 25, 50, 100]) {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/time-entries?page_size=${pageSize}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination.pageSize).toBe(pageSize);
      }
    });

    it('should default to 25 for invalid page_size', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/time-entries?page_size=999`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(25);
    });

    it('should return correct pagination metadata', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/time-entries?page_size=2`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination.total).toBeGreaterThan(0);
      expect(response.body.pagination.totalPages).toBeGreaterThan(0);
    });
  });

  describe('Expenses Pagination and Sorting', () => {
    it('should return expenses sorted by expenseDate DESC', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check DESC order
      for (let i = 0; i < response.body.data.length - 1; i++) {
        const current = response.body.data[i].expenseDate;
        const next = response.body.data[i + 1].expenseDate;
        expect(current >= next).toBe(true);
      }
    });

    it('should support pagination with default page_size of 25', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(25);
      expect(response.body.pagination.page).toBe(1);
    });

    it('should support custom page_size', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/expenses?page_size=10`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(10);
    });

    it('should support page_size options: 10, 25, 50, 100', async () => {
      for (const pageSize of [10, 25, 50, 100]) {
        const response = await request(app)
          .get(`/api/projects/${testProjectId}/expenses?page_size=${pageSize}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination.pageSize).toBe(pageSize);
      }
    });
  });

  describe('Invoices Pagination and Sorting', () => {
    beforeAll(async () => {
      // Create an invoice for testing
      await request(app)
        .post(`/api/projects/${testProjectId}/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dateInvoiced: '2025-01-25',
          upToDate: '2025-01-25',
          notes: 'Test invoice',
          groupByDay: false,
        });
    });

    it('should return invoices sorted by dateInvoiced DESC', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);

      if (response.body.data.length > 1) {
        // Check DESC order
        for (let i = 0; i < response.body.data.length - 1; i++) {
          const current = response.body.data[i].dateInvoiced;
          const next = response.body.data[i + 1].dateInvoiced;
          expect(current >= next).toBe(true);
        }
      }
    });

    it('should support pagination with default page_size of 25', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(25);
      expect(response.body.pagination.page).toBe(1);
    });

    it('should support custom page_size', async () => {
      const response = await request(app)
        .get('/api/invoices?page_size=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(10);
    });
  });
});
