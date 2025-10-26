import { describe, test, expect, beforeAll } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { ensureTestSettings, createAuthenticatedAgent, createTestClientData, expectValidationError, expectUnauthorized, expectNotFound } from "./helpers.js";

describe("Clients Routes", () => {
  let app: any;
  let agent: request.SuperAgentTest;

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
      expect(Array.isArray(res.body)).toBe(true);
    });

    test("should support pagination", async () => {
      await agent.post("/api/clients").send({ name: "Client 1" });
      await agent.post("/api/clients").send({ name: "Client 2" });
      await agent.post("/api/clients").send({ name: "Client 3" });

      const res = await agent.get("/api/clients?page=1&pageSize=2");

      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(2);
    });

    test("should search by name", async () => {
      const uniqueName = `SearchTest-${Date.now()}`;
      await agent.post("/api/clients").send({ name: uniqueName });

      const res = await agent.get(`/api/clients?query=${uniqueName}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBe(uniqueName);
    });

    test("should search by email", async () => {
      const uniqueEmail = `search${Date.now()}@test.com`;
      await agent.post("/api/clients").send({ 
        name: "Search Client",
        email: uniqueEmail
      });

      const res = await agent.get(`/api/clients?query=${uniqueEmail}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].email).toBe(uniqueEmail);
    });

    test("should search by contact person", async () => {
      const uniqueContact = `Contact-${Date.now()}`;
      await agent.post("/api/clients").send({ 
        name: "Search Client",
        contactPerson: uniqueContact
      });

      const res = await agent.get(`/api/clients?query=${uniqueContact}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].contactPerson).toBe(uniqueContact);
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
