import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { ensureTestSettings, createAuthenticatedAgent, createTestClientData, createTestProjectData, expectValidationError, expectUnauthorized, expectNotFound } from "./helpers.js";
import { db } from "../db/index.js";
import { timeEntries } from "../db/schema.js";
import { isNull, sql } from "drizzle-orm";

describe("Projects Routes", () => {
  let app: any;
  let agent: ReturnType<typeof request.agent>;
  let testClientId: number;

  beforeAll(async () => {
    ensureTestSettings();
    app = createApp();
    agent = request.agent(app);
    await createAuthenticatedAgent(agent);

    const client = await agent.post("/api/clients").send(createTestClientData());
    testClientId = client.body.id;
  });

  afterAll(() => {
  });

  describe("POST /api/projects", () => {
    test("should create project with all fields", async () => {
      const projectData = createTestProjectData(testClientId);
      const res = await agent.post("/api/projects").send(projectData);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(projectData.name);
      expect(res.body.clientId).toBe(testClientId);
      expect(res.body.hourlyRate).toBe(projectData.hourlyRate);
      expect(res.body.active).toBe(true);
      expect(res.body.id).toBeDefined();
    });

    test("should create project with minimal fields", async () => {
      const res = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Minimal Project"
      });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Minimal Project");
      expect(res.body.hourlyRate).toBe(0);
      expect(res.body.active).toBe(true);
    });

    test("should reject missing name", async () => {
      const res = await agent.post("/api/projects").send({
        clientId: testClientId
      });

      expectValidationError(res, "name");
    });

    test("should reject missing clientId", async () => {
      const res = await agent.post("/api/projects").send({
        name: "Test Project"
      });

      expectValidationError(res, "clientId");
    });

    test("should reject negative hourlyRate", async () => {
      const res = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Test",
        hourlyRate: -10
      });

      expectValidationError(res);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.post("/api/projects").send({
        clientId: testClientId,
        name: "Test"
      });

      expectUnauthorized(res);
    });
  });

  describe("GET /api/projects", () => {
    test("should list all projects with client data", async () => {
      const res = await agent.get("/api/projects");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].client).toBeDefined();
      }
    });

    test("should filter by active status", async () => {
      await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Active Project",
        active: true
      });
      await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Inactive Project",
        active: false
      });

      const activeRes = await agent.get("/api/projects?active=true");
      expect(activeRes.status).toBe(200);
      expect(Array.isArray(activeRes.body.data)).toBe(true);
      expect(activeRes.body.data.every((p: any) => p.active === true)).toBe(true);

      const inactiveRes = await agent.get("/api/projects?active=false");
      expect(inactiveRes.status).toBe(200);
      expect(Array.isArray(inactiveRes.body.data)).toBe(true);
      expect(inactiveRes.body.data.every((p: any) => p.active === false)).toBe(true);
    });

    test("should filter by clientId", async () => {
      const client2 = await agent.post("/api/clients").send(createTestClientData());
      const client2Id = client2.body.id;

      await agent.post("/api/projects").send({
        clientId: client2Id,
        name: "Client 2 Project"
      });

      const res = await agent.get(`/api/projects?clientId=${client2Id}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((p: any) => p.clientId === client2Id)).toBe(true);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.get("/api/projects");

      expectUnauthorized(res);
    });
  });

  describe("GET /api/projects/:id", () => {
    test("should get project by id with client data", async () => {
      const created = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Get Test"
      });
      const projectId = created.body.id;

      const res = await agent.get(`/api/projects/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(projectId);
      expect(res.body.name).toBe("Get Test");
      expect(res.body.client).toBeDefined();
    });

    test("should return 404 for non-existent project", async () => {
      const res = await agent.get("/api/projects/999999");

      expectNotFound(res);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.get("/api/projects/1");

      expectUnauthorized(res);
    });
  });

  describe("PUT /api/projects/:id", () => {
    test("should update project", async () => {
      const created = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Update Test"
      });
      const projectId = created.body.id;

      const updates = {
        name: "Updated Name",
        hourlyRate: 200,
        active: false
      };

      const res = await agent.put(`/api/projects/${projectId}`).send(updates);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(updates.name);
      expect(res.body.hourlyRate).toBe(updates.hourlyRate);
      expect(res.body.active).toBe(updates.active);
    });

    test("should update project clientId", async () => {
      // Create project with first client
      const created = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Client Change Test"
      });
      const projectId = created.body.id;

      // Create a second client
      const client2 = await agent.post("/api/clients").send(createTestClientData());
      const client2Id = client2.body.id;

      // Update project to use second client
      const res = await agent.put(`/api/projects/${projectId}`).send({
        clientId: client2Id
      });

      expect(res.status).toBe(200);
      expect(res.body.clientId).toBe(client2Id);

      // Verify the change persisted by getting the project again
      const getRes = await agent.get(`/api/projects/${projectId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.clientId).toBe(client2Id);
      expect(getRes.body.client.id).toBe(client2Id);
    });

    test("should return 404 for non-existent project", async () => {
      const res = await agent.put("/api/projects/999999").send({ name: "Test" });

      expectNotFound(res);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.put("/api/projects/1").send({ name: "Test" });

      expectUnauthorized(res);
    });
  });

  describe("DELETE /api/projects/:id", () => {
    test("should delete project without time entries or expenses", async () => {
      const created = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Delete Test"
      });
      const projectId = created.body.id;

      const res = await agent.delete(`/api/projects/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("should prevent deletion of project with time entries", async () => {
      const project = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Project With Time"
      });
      const projectId = project.body.id;

      await agent.post(`/api/projects/${projectId}/time-entries`).send({
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600000).toISOString()
      });

      const res = await agent.delete(`/api/projects/${projectId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("time entries");
    });

    test("should prevent deletion of project with expenses", async () => {
      const project = await agent.post("/api/projects").send({
        clientId: testClientId,
        name: "Project With Expenses"
      });
      const projectId = project.body.id;

      await agent.post(`/api/projects/${projectId}/expenses`).send({
        expenseDate: new Date().toISOString().split('T')[0],
        description: "Test",
        amount: 100
      });

      const res = await agent.delete(`/api/projects/${projectId}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("expenses");
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.delete("/api/projects/1");

      expectUnauthorized(res);
    });
  });

  describe("Timer Endpoints", () => {
    const cleanupTimers = async () => {
      await db.delete(timeEntries);
    };

    beforeAll(async () => {
      await cleanupTimers();
    });

    beforeEach(async () => {
      await cleanupTimers();
    });

    afterEach(async () => {
      await cleanupTimers();
    });

    describe("GET /api/projects/timer/current", () => {
      test("should return null when no timer running", async () => {

        const res = await agent.get("/api/projects/timer/current");

        expect(res.status).toBe(200);
      });

      test("should return current timer with project and client", async () => {
        const project = await agent.post("/api/projects").send({
          clientId: testClientId,
          name: "Timer Test"
        });
        const projectId = project.body.id;

        const startRes = await agent.post(`/api/projects/${projectId}/timer/start`);
        expect(startRes.status).toBe(201);

        const res = await agent.get("/api/projects/timer/current");

        expect(res.status).toBe(200);
        expect(res.body.projectId).toBe(projectId);
        expect(res.body.project).toBeDefined();
        expect(res.body.client).toBeDefined();
        expect(res.body.endAt).toBeNull();
      });
    });

    describe("POST /api/projects/:id/timer/start", () => {
      test("should start timer for project", async () => {
        const project = await agent.post("/api/projects").send({
          clientId: testClientId,
          name: "Start Timer Test"
        });
        const projectId = project.body.id;

        const res = await agent.post(`/api/projects/${projectId}/timer/start`);

        expect(res.status).toBe(201);
        expect(res.body.projectId).toBe(projectId);
        expect(res.body.startAt).toBeDefined();
        expect(res.body.endAt).toBeNull();
      });

      test("should reject starting timer when another is running", async () => {
        const project1 = await agent.post("/api/projects").send({
          clientId: testClientId,
          name: "Timer 1"
        });
        const project2 = await agent.post("/api/projects").send({
          clientId: testClientId,
          name: "Timer 2"
        });

        await agent.post(`/api/projects/${project1.body.id}/timer/start`);
        const res = await agent.post(`/api/projects/${project2.body.id}/timer/start`);

        expect(res.status).toBe(409);
        expect(res.body.error).toContain("already running");
      });
    });

    describe("POST /api/projects/:id/timer/stop", () => {
      test("should stop running timer", async () => {
        const project = await agent.post("/api/projects").send({
          clientId: testClientId,
          name: "Stop Timer Test"
        });
        const projectId = project.body.id;

        const startRes = await agent.post(`/api/projects/${projectId}/timer/start`);
        expect(startRes.status).toBe(201);
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const res = await agent.post(`/api/projects/${projectId}/timer/stop`).send({});

        expect(res.status).toBe(200);
        expect(res.body.endAt).toBeDefined();
        expect(res.body.totalHours).toBeGreaterThan(0);
      });

      test("should return 404 when no timer running for project", async () => {
        const project = await agent.post("/api/projects").send({
          clientId: testClientId,
          name: "No Timer Test"
        });

        const res = await agent.post(`/api/projects/${project.body.id}/timer/stop`).send({});

        expectNotFound(res);
      });
    });
  });
});
