import { describe, test, expect, beforeAll, spyOn } from "bun:test";
import { db } from '../db/index.js';
import { invoices, projects, clients } from '../db/schema.js';
import * as invoiceSummaryService from '../services/clientInvoiceSummary.js';
import request from "supertest";
import { createApp } from "../app.js";
import { ensureTestSettings, createAuthenticatedAgent, createTestClientData, expectValidationError, expectUnauthorized, expectNotFound } from "./helpers.js";

describe("Clients Routes", () => {
  let app: any;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ensureTestSettings();
    app = createApp();
    agent = request.agent(app);
    await createAuthenticatedAgent(agent);
  });

  describe("POST /api/clients", () => {
    test("should create client with all fields", async () => {
      const clientData = createTestClientData();
      const res = await agent.post("/api/clients").send(clientData);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(clientData.name);
      expect(res.body.email).toBe(clientData.email);
      expect(res.body.contactPerson).toBe(clientData.contactPerson);
      expect(res.body.address).toBe(clientData.address);
      expect(res.body.defaultHourlyRate).toBe(clientData.defaultHourlyRate);
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    test("should create client with invoiceEmail", async () => {
      const clientData = createTestClientData();
      clientData.invoiceEmail = "billing@example.com";
      const res = await agent.post("/api/clients").send(clientData);

      expect(res.status).toBe(201);
      expect(res.body.invoiceEmail).toBe("billing@example.com");
    });

    test("should create client with minimal fields", async () => {
      const res = await agent.post("/api/clients").send({ name: "Minimal Client" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Minimal Client");
      expect(res.body.defaultHourlyRate).toBe(0);
    });

    test("should reject missing name", async () => {
      const res = await agent.post("/api/clients").send({ email: "test@test.com" });

      expectValidationError(res, "name");
    });

    test("should reject empty name", async () => {
      const res = await agent.post("/api/clients").send({ name: "" });

      expectValidationError(res, "name");
    });

    test("should reject invalid email", async () => {
      const res = await agent.post("/api/clients").send({
        name: "Test",
        email: "not-an-email"
      });

      expectValidationError(res, "email");
    });

    test("should accept empty email", async () => {
      const res = await agent.post("/api/clients").send({
        name: "Test Empty Email",
        email: ""
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe("");
    });

    test("should reject negative defaultHourlyRate", async () => {
      const res = await agent.post("/api/clients").send({
        name: "Test",
        defaultHourlyRate: -10
      });

      expectValidationError(res);
    });

    test("should accept zero defaultHourlyRate", async () => {
      const res = await agent.post("/api/clients").send({
        name: "Test Zero Rate",
        defaultHourlyRate: 0
      });

      expect(res.status).toBe(201);
      expect(res.body.defaultHourlyRate).toBe(0);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.post("/api/clients").send({ name: "Test" });

      expectUnauthorized(res);
    });
  });

  describe("GET /api/clients", () => {
    test("should list all clients", async () => {
      const res = await agent.get("/api/clients");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("should support pagination", async () => {
      await agent.post("/api/clients").send({ name: "Client 1" });
      await agent.post("/api/clients").send({ name: "Client 2" });
      await agent.post("/api/clients").send({ name: "Client 3" });

      const res = await agent.get("/api/clients?page=1&page_size=2");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(2);
    });

    test("should search by name", async () => {
      const uniqueName = `SearchTest-${Date.now()}`;
      await agent.post("/api/clients").send({ name: uniqueName });

      const res = await agent.get(`/api/clients?query=${uniqueName}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].name).toBe(uniqueName);
    });

    test("should search by email", async () => {
      const uniqueEmail = `search${Date.now()}@test.com`;
      await agent.post("/api/clients").send({
        name: "Search Client",
        email: uniqueEmail
      });

      const res = await agent.get(`/api/clients?query=${uniqueEmail}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].email).toBe(uniqueEmail);
    });

    test("should search by contact person", async () => {
      const uniqueContact = `Contact-${Date.now()}`;
      await agent.post("/api/clients").send({
        name: "Search Client",
        contactPerson: uniqueContact
      });

      const res = await agent.get(`/api/clients?query=${uniqueContact}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].contactPerson).toBe(uniqueContact);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.get("/api/clients");

      expectUnauthorized(res);
    });
  });

  describe("GET /api/clients/:id", () => {
    test("should get client by id", async () => {
      const created = await agent.post("/api/clients").send({ name: "Get Test" });
      const clientId = created.body.id;

      const res = await agent.get(`/api/clients/${clientId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(clientId);
      expect(res.body.name).toBe("Get Test");
    });

    test("should return 404 for non-existent client", async () => {
      const res = await agent.get("/api/clients/999999");

      expectNotFound(res);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.get("/api/clients/1");

      expectUnauthorized(res);
    });
  });

  describe('Client invoice summary', () => {
    async function createSummaryClient() {
      const [client] = await db.insert(clients).values({ name: 'Summary Client' }).returning();
      const [project] = await db.insert(projects).values({ clientId: client.id, name: 'Summary Project' }).returning();
      return { client, project };
    }

    async function addInvoice(clientId: number, projectId: number, overrides: Partial<typeof invoices.$inferInsert> = {}) {
      const [invoice] = await db.insert(invoices).values({
        number: `summary-${crypto.randomUUID()}`,
        clientId,
        projectId,
        dateInvoiced: '2020-01-01',
        dueDate: '2020-01-10',
        datePaid: '2020-01-12',
        status: 'Paid',
        subtotal: 100,
        total: 100,
        ...overrides,
      }).returning();
      return invoice;
    }

    test('returns an explicit empty sample without changing the client fields', async () => {
      const { client } = await createSummaryClient();
      const res = await agent.get(`/api/clients/${client.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(client.name);
      expect(res.body.invoiceSummary).toEqual({ invoiceCount: 0, avgDaysToPay: null, avgOverdue: null, total: 0, invoiceAverage: 0 });
    });

    test('includes a single old paid invoice without a rolling-year cutoff', async () => {
      const { client, project } = await createSummaryClient();
      await addInvoice(client.id, project.id, { total: 0 });
      const res = await agent.get(`/api/clients/${client.id}`);
      expect(res.body.invoiceSummary).toEqual({ invoiceCount: 1, avgDaysToPay: 11, avgOverdue: 2, total: 0, invoiceAverage: 0 });
    });

    test('includes all projects but excludes other clients and non-paid statuses', async () => {
      const { client, project } = await createSummaryClient();
      const [secondProject] = await db.insert(projects).values({ clientId: client.id, name: 'Second project' }).returning();
      await addInvoice(client.id, project.id, { total: 10.11 });
      await addInvoice(client.id, secondProject.id, { total: 20.22, datePaid: '2020-01-08' });
      for (const status of ['Draft', 'Sent', 'Cancelled']) {
        await addInvoice(client.id, project.id, { status, total: 10000, dateInvoiced: '2030-01-01' });
      }
      const other = await createSummaryClient();
      await addInvoice(other.client.id, other.project.id, { total: 10000 });
      const res = await agent.get(`/api/clients/${client.id}`);
      expect(res.body.invoiceSummary).toEqual({ invoiceCount: 2, avgDaysToPay: 9, avgOverdue: 0, total: 30.33, invoiceAverage: 15.17 });
    });

    test('takes the latest twelve by invoice date then descending ID, not payment date', async () => {
      const { client, project } = await createSummaryClient();
      // Insert a newer date first so ID-only ordering cannot pass.
      await addInvoice(client.id, project.id, { dateInvoiced: '2021-01-01', total: 10 });
      for (let i = 0; i < 13; i++) {
        await addInvoice(client.id, project.id, { total: i, datePaid: `2020-02-${String(28 - i).padStart(2, '0')}` });
      }
      const res = await agent.get(`/api/clients/${client.id}`);
      expect(res.status).toBe(200);
      expect(res.body.invoiceSummary.invoiceCount).toBe(12);
      expect(res.body.invoiceSummary.total).toBe(87); // 10 plus 2 through 12
      expect(res.body.invoiceSummary.invoiceAverage).toBe(7.25);
    });

    test('uses independent valid date denominators while retaining every invoice total', async () => {
      const { client, project } = await createSummaryClient();
      await addInvoice(client.id, project.id, { dateInvoiced: 'bad date', datePaid: '2020-01-08', total: 10 });
      await addInvoice(client.id, project.id, { dueDate: '2020-02-30', datePaid: '2020-01-12', total: 20 });
      await addInvoice(client.id, project.id, { datePaid: null, total: 30 });
      await addInvoice(client.id, project.id, { datePaid: 'invalid', total: 40 });
      const res = await agent.get(`/api/clients/${client.id}`);
      expect(res.body.invoiceSummary).toEqual({ invoiceCount: 4, avgDaysToPay: 11, avgOverdue: -2, total: 100, invoiceAverage: 25 });
    });

    test('keeps negative overdue and unavailable day metrics distinct from zero', () => {
      const calculate = invoiceSummaryService.calculateClientInvoiceSummary;
      expect(calculate([{ total: 0, dateInvoiced: '2024-01-01', dueDate: '2024-01-10', datePaid: '2024-01-08' }])).toEqual({
        invoiceCount: 1, avgDaysToPay: 7, avgOverdue: -2, total: 0, invoiceAverage: 0,
      });
      expect(calculate([{ total: 10, dateInvoiced: 'invalid', dueDate: 'invalid', datePaid: null }])).toEqual({
        invoiceCount: 1, avgDaysToPay: null, avgOverdue: null, total: 10, invoiceAverage: 10,
      });
    });

    test('uses calendar days across leap day, DST and stored timestamp offsets', () => {
      const calculate = invoiceSummaryService.calculateClientInvoiceSummary;
      for (const [dateInvoiced, datePaid, days] of [
        ['2024-02-28', '2024-03-01', 2],
        ['2024-09-28', '2024-09-30', 2],
        ['2024-04-06T23:30:00+13:00', '2024-04-08T00:30:00+12:00', 2],
      ] as const) {
        expect(calculate([{ total: 1, dateInvoiced, dueDate: dateInvoiced, datePaid }]).avgDaysToPay).toBe(days);
      }
    });

    test('rounds day averages to one decimal and money to two decimals', () => {
      const sample = [1, 1, 2].map(days => ({ total: 0.111, dateInvoiced: '2024-01-01', dueDate: '2024-01-01', datePaid: `2024-01-0${days + 1}` }));
      expect(invoiceSummaryService.calculateClientInvoiceSummary(sample)).toEqual({
        invoiceCount: 3, avgDaysToPay: 1.3, avgOverdue: 1.3, total: 0.33, invoiceAverage: 0.11,
      });
      expect(() => invoiceSummaryService.calculateClientInvoiceSummary([{ ...sample[0], total: Infinity }])).toThrow('Non-finite');
    });

    test('isolates summary failure from reading and updating the client', async () => {
      const { client } = await createSummaryClient();
      const summarySpy = spyOn(invoiceSummaryService, 'getClientInvoiceSummary').mockRejectedValue(new Error('forced summary failure'));
      try {
        const res = await agent.get(`/api/clients/${client.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(client.id);
        expect(res.body.name).toBe(client.name);
        expect(res.body.invoiceSummary).toBeNull();
        const updated = await agent.put(`/api/clients/${client.id}`).send({ name: 'Still editable' });
        expect(updated.status).toBe(200);
        expect(updated.body.name).toBe('Still editable');
        expectNotFound(await agent.get('/api/clients/999999'));
        expectUnauthorized(await request(app).get(`/api/clients/${client.id}`));
      } finally {
        summarySpy.mockRestore();
      }
    });
  });

  describe("PUT /api/clients/:id", () => {
    test("should update client", async () => {
      const created = await agent.post("/api/clients").send({ name: "Update Test" });
      const clientId = created.body.id;

      const updates = {
        name: "Updated Name",
        email: "updated@test.com",
        defaultHourlyRate: 150
      };

      const res = await agent.put(`/api/clients/${clientId}`).send(updates);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(updates.name);
      expect(res.body.email).toBe(updates.email);
      expect(res.body.defaultHourlyRate).toBe(updates.defaultHourlyRate);
    });

    test("should update partial fields", async () => {
      const created = await agent.post("/api/clients").send({
        name: "Partial Update Test",
        email: "original@test.com"
      });
      const clientId = created.body.id;

      const res = await agent.put(`/api/clients/${clientId}`).send({ name: "New Name" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
      expect(res.body.email).toBe("original@test.com");
    });

    test("should return 404 for non-existent client", async () => {
      const res = await agent.put("/api/clients/999999").send({ name: "Test" });

      expectNotFound(res);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.put("/api/clients/1").send({ name: "Test" });

      expectUnauthorized(res);
    });
  });

  describe("DELETE /api/clients/:id", () => {
    test("should delete client without projects", async () => {
      const created = await agent.post("/api/clients").send({ name: "Delete Test" });
      const clientId = created.body.id;

      const res = await agent.delete(`/api/clients/${clientId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const getRes = await agent.get(`/api/clients/${clientId}`);
      expectNotFound(getRes);
    });

    test("should prevent deletion of client with projects", async () => {
      const client = await agent.post("/api/clients").send({ name: "Client With Project" });
      const clientId = client.body.id;

      await agent.post("/api/projects").send({
        clientId,
        name: "Test Project",
        hourlyRate: 100
      });

      const res = await agent.delete(`/api/clients/${clientId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("associated projects");
      expect(res.body.projectCount).toBe(1);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.delete("/api/clients/1");

      expectUnauthorized(res);
    });
  });
});
