import type { SuperAgentTest } from 'supertest';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';

export function ensureTestSettings() {
  db.insert(settings).values({
    id: 1,
    companyName: 'Test Business',
    companyAddress: '123 Test St',
    companyEmail: 'test@example.com',
    companyPhone: '555-1234',
    invoiceFooterMarkdown: '',
    nextInvoiceNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: settings.id,
    set: {
      companyName: 'Test Business',
      companyAddress: '123 Test St',
      companyEmail: 'test@example.com',
      companyPhone: '555-1234',
      invoiceFooterMarkdown: '',
      nextInvoiceNumber: 1,
      updatedAt: new Date().toISOString(),
    }
  }).run();
}

export async function createAuthenticatedAgent(agent: SuperAgentTest) {
  await agent
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin' });
  return agent;
}

export async function loginAsTestUser(agent: SuperAgentTest) {
  await agent
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin' });
}

export async function createTestClient(agent: SuperAgentTest, overrides: any = {}): Promise<number> {
  const response = await agent
    .post('/api/clients')
    .send(createTestClientData(overrides));
  return response.body.id;
}

export async function createTestProject(agent: SuperAgentTest, clientId: number, overrides: any = {}): Promise<number> {
  const response = await agent
    .post('/api/projects')
    .send(createTestProjectData(clientId, overrides));
  return response.body.id;
}

export async function createTestTimeEntry(agent: SuperAgentTest, projectId: number, overrides: any = {}): Promise<number> {
  const response = await agent
    .post('/api/time-entries')
    .send(createTestTimeEntryData(projectId, overrides));
  return response.body.id;
}

export async function createTestExpense(agent: SuperAgentTest, projectId: number, overrides: any = {}): Promise<number> {
  const response = await agent
    .post(`/api/projects/${projectId}/expenses`)
    .send(createTestExpenseData(projectId, overrides));
  return response.body.id;
}

export function createTestClientData(overrides: any = {}) {
  return {
    name: `Test Client ${Date.now()}`,
    email: 'test@example.com',
    contactPerson: 'John Doe',
    address: '123 Test St',
    defaultHourlyRate: 100,
    notes: '',
    ...overrides,
  };
}

export function createTestProjectData(clientId: number, overrides: any = {}) {
  return {
    clientId,
    name: `Test Project ${Date.now()}`,
    hourlyRate: 150,
    active: true,
    notes: '',
    ...overrides,
  };
}

export function createTestTimeEntryData(projectId: number, overrides: any = {}) {
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + 3600000);
  
  return {
    projectId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    note: 'Test time entry',
    ...overrides,
  };
}

export function createTestExpenseData(projectId: number, overrides: any = {}) {
  return {
    projectId,
    expenseDate: new Date().toISOString().split('T')[0],
    description: 'Test expense',
    amount: 50,
    isBillable: true,
    ...overrides,
  };
}

export function createTestInvoiceData(overrides: any = {}) {
  const dateInvoiced = new Date().toISOString().split('T')[0];
  
  return {
    dateInvoiced,
    upToDate: dateInvoiced,
    notes: 'Test invoice',
    groupByDay: false,
    ...overrides,
  };
}

export function expectValidationError(res: any, field?: string) {
  if (res.status !== 400) {
    throw new Error(`Expected status 400 but got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  if (field && !JSON.stringify(res.body).toLowerCase().includes(field.toLowerCase())) {
    throw new Error(`Expected error to mention field "${field}" but got: ${JSON.stringify(res.body)}`);
  }
}

export function expectUnauthorized(res: any) {
  if (res.status !== 401) {
    throw new Error(`Expected status 401 but got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

export function expectNotFound(res: any) {
  if (res.status !== 404) {
    throw new Error(`Expected status 404 but got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

export function expectSuccess(res: any, expectedStatus = 200) {
  if (res.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} but got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}
