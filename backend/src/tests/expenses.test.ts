import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { clients, expenses, invoiceLineItems, invoices, projects, timeEntries } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  createTestClient,
  createTestProject,
  loginAsTestUser,
} from './helpers.js';

const app = createApp();
let server: ReturnType<typeof app.listen>;

describe('Expenses API', () => {
  beforeAll(async () => {
    server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    await db.delete(invoiceLineItems);
    await db.delete(invoices);
    await db.delete(timeEntries);
    await db.delete(expenses);
    await db.delete(projects);
    await db.delete(clients);
  });

  async function createAgent() {
    const agent = request.agent(server);
    await loginAsTestUser(agent);
    return agent;
  }

  async function createProjectWithClient(agent: ReturnType<typeof request.agent>, name = 'Expense Project') {
    const clientId = await createTestClient(agent, { name: 'Expense Client' });
    const projectId = await createTestProject(agent, clientId, { name });
    return { clientId, projectId };
  }

  test('creates a general expense and forces it to be non-billable', async () => {
    const agent = await createAgent();

    const response = await agent.post('/api/expenses').send({
      projectId: null,
      expenseDate: '2026-08-28',
      description: 'New Laptop',
      amount: 2000,
      isBillable: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.projectId).toBeNull();
    expect(response.body.isBillable).toBe(false);
  });

  test('creates a project-linked expense globally and returns enriched project data', async () => {
    const agent = await createAgent();
    const { projectId } = await createProjectWithClient(agent);

    const response = await agent.post('/api/expenses').send({
      projectId,
      expenseDate: '2026-08-28',
      description: 'Travel',
      amount: 125,
      isBillable: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.projectId).toBe(projectId);
    expect(response.body.isBillable).toBe(true);

    const listResponse = await agent.get('/api/expenses');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data[0].project.id).toBe(projectId);
    expect(listResponse.body.data[0].client.name).toBe('Expense Client');
  });

  test('lists general and project expenses with inclusive date, description, project, and general filters', async () => {
    const agent = await createAgent();
    const { projectId } = await createProjectWithClient(agent, 'Filtered Project');

    await agent.post('/api/expenses').send({
      projectId: null,
      expenseDate: '2026-01-01',
      description: 'Office search target',
      amount: 10,
    });
    await agent.post('/api/expenses').send({
      projectId,
      expenseDate: '2026-01-31',
      description: 'Project expense',
      amount: 20,
    });
    await agent.post('/api/expenses').send({
      projectId,
      expenseDate: '2026-02-01',
      description: 'Outside range',
      amount: 30,
    });

    const dateResponse = await agent.get('/api/expenses?from=2026-01-01&to=2026-01-31');
    expect(dateResponse.body.data).toHaveLength(2);
    expect(dateResponse.body.data.map((expense: { expenseDate: string }) => expense.expenseDate))
      .toEqual(['2026-01-31', '2026-01-01']);

    const searchResponse = await agent.get('/api/expenses?query=SEARCH%20TARGET');
    expect(searchResponse.body.data).toHaveLength(1);
    expect(searchResponse.body.data[0].description).toBe('Office search target');

    const projectResponse = await agent.get(`/api/expenses?projectId=${projectId}`);
    expect(projectResponse.body.data).toHaveLength(2);

    const generalResponse = await agent.get('/api/expenses?projectId=general');
    expect(generalResponse.body.data).toHaveLength(1);
    expect(generalResponse.body.data[0].projectId).toBeNull();
  });

  test('returns the filtered total amount before pagination', async () => {
    const agent = await createAgent();

    for (const amount of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]) {
      await agent.post('/api/expenses').send({
        projectId: null,
        expenseDate: '2026-08-28',
        description: `Expense ${amount}`,
        amount,
      });
    }

    const response = await agent.get('/api/expenses?page=2&page_size=10');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination.total).toBe(11);
    expect(response.body.totalAmount).toBe(660);
  });

  test('assigns and removes a project from an uninvoiced expense', async () => {
    const agent = await createAgent();
    const { projectId } = await createProjectWithClient(agent);

    const created = await agent.post('/api/expenses').send({
      projectId: null,
      expenseDate: '2026-08-28',
      description: 'Assignable expense',
      amount: 50,
      isBillable: false,
    });

    const assigned = await agent.put(`/api/expenses/${created.body.id}`).send({ projectId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.projectId).toBe(projectId);
    expect(assigned.body.isBillable).toBe(false);

    const removed = await agent.put(`/api/expenses/${created.body.id}`).send({
      projectId: null,
      isBillable: true,
    });
    expect(removed.status).toBe(200);
    expect(removed.body.projectId).toBeNull();
    expect(removed.body.isBillable).toBe(false);
  });

  test('rejects project changes for invoiced expenses', async () => {
    const agent = await createAgent();
    const first = await createProjectWithClient(agent, 'First Project');
    const second = await createProjectWithClient(agent, 'Second Project');

    const created = await agent.post('/api/expenses').send({
      projectId: first.projectId,
      expenseDate: '2026-08-28',
      description: 'Invoiced expense',
      amount: 100,
    });
    await db.update(expenses)
      .set({ isInvoiced: true })
      .where(eq(expenses.id, created.body.id));

    const changeResponse = await agent.put(`/api/expenses/${created.body.id}`).send({
      projectId: second.projectId,
    });
    expect(changeResponse.status).toBe(409);

    const clearResponse = await agent.put(`/api/expenses/${created.body.id}`).send({
      projectId: null,
    });
    expect(clearResponse.status).toBe(409);
  });

  test('keeps project-scoped expense creation and listing working', async () => {
    const agent = await createAgent();
    const { projectId } = await createProjectWithClient(agent);

    const createResponse = await agent.post(`/api/projects/${projectId}/expenses`).send({
      expenseDate: '2026-08-28',
      description: 'Project scoped expense',
      amount: 75,
      isBillable: true,
    });
    expect(createResponse.status).toBe(201);

    const listResponse = await agent.get(`/api/projects/${projectId}/expenses`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data[0].description).toBe('Project scoped expense');
  });

  test('includes general expenses in CSV export', async () => {
    const agent = await createAgent();
    await agent.post('/api/expenses').send({
      projectId: null,
      expenseDate: '2026-08-28',
      description: 'General CSV expense',
      amount: 88,
    });

    const response = await agent.get('/api/export/expenses?from=2026-08-28&to=2026-08-28');

    expect(response.status).toBe(200);
    expect(response.text).toContain('General CSV expense');
    expect(response.text).toContain('General');
  });
});
