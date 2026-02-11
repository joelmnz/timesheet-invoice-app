import { describe, test, expect, beforeAll } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { ensureTestSettings, createAuthenticatedAgent, expectValidationError, expectUnauthorized } from "./helpers.js";

describe("Settings Routes", () => {
  let app: any;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ensureTestSettings();
    app = createApp();
    agent = request.agent(app);
    await createAuthenticatedAgent(agent);
  });

  describe("GET /api/settings", () => {
    test("should return settings with timezone", async () => {
      const res = await agent.get("/api/settings");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.timezone).toBe("Pacific/Auckland");
      expect(res.body.companyName).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.get("/api/settings");

      expectUnauthorized(res);
    });
  });

  describe("PUT /api/settings", () => {
    test("should update settings successfully", async () => {
      const updates = {
        companyName: "Updated Company",
        companyAddress: "456 New St",
        companyEmail: "new@example.com",
        companyPhone: "555-9999",
        invoiceFooterMarkdown: "Thank you!",
        nextInvoiceNumber: 100
      };

      const res = await agent
        .put("/api/settings")
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(updates);
    });

    test("should update only provided fields", async () => {
      const current = await agent.get("/api/settings");
      
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Partial Update",
          nextInvoiceNumber: current.body.nextInvoiceNumber
        });

      expect(res.status).toBe(200);
      expect(res.body.companyName).toBe("Partial Update");
      expect(res.body.companyEmail).toBeDefined();
    });

    test("should reject missing companyName", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ companyAddress: "123 St" });

      expectValidationError(res, "companyName");
    });

    test("should reject empty companyName", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ companyName: "" });

      expectValidationError(res, "companyName");
    });

    test("should reject invalid email", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Test",
          companyEmail: "not-an-email"
        });

      expectValidationError(res, "email");
    });

    test("should accept empty email", async () => {
      const current = await agent.get("/api/settings");
      
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Test",
          companyEmail: "",
          nextInvoiceNumber: current.body.nextInvoiceNumber
        });

      expect(res.status).toBe(200);
      expect(res.body.companyEmail).toBe("");
    });

    test("should reject negative nextInvoiceNumber", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Test",
          nextInvoiceNumber: -1
        });

      expectValidationError(res);
    });

    test("should reject zero nextInvoiceNumber", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Test",
          nextInvoiceNumber: 0
        });

      expectValidationError(res);
    });

    test("should reject non-integer nextInvoiceNumber", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Test",
          nextInvoiceNumber: 1.5
        });

      expectValidationError(res);
    });

    test("should reject too long invoiceFooterMarkdown", async () => {
      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Test",
          invoiceFooterMarkdown: "a".repeat(5001)
        });

      expectValidationError(res);
    });

    test("should update updatedAt timestamp", async () => {
      const before = await agent.get("/api/settings");
      const oldUpdatedAt = before.body.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const res = await agent
        .put("/api/settings")
        .send({ 
          companyName: "Timestamp Test",
          nextInvoiceNumber: before.body.nextInvoiceNumber
        });

      expect(res.status).toBe(200);
      expect(res.body.updatedAt).not.toBe(oldUpdatedAt);
    });

    test("should require authentication", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent
        .put("/api/settings")
        .send({ companyName: "Test" });

      expectUnauthorized(res);
    });
  });

  describe("API Key Management", () => {
    test("should generate and list API key with name", async () => {
      const generateRes = await agent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Test Key 1" });

      expect(generateRes.status).toBe(201);
      expect(generateRes.body.apiKey).toMatch(/^tsia_/);
      expect(generateRes.body.name).toBe("Test Key 1");
      expect(generateRes.body.warning).toBeDefined();

      const listRes = await agent.get("/api/settings/api-keys");
      expect(listRes.status).toBe(200);
      expect(listRes.body.keys.length).toBeGreaterThan(0);

      const createdKey = listRes.body.keys.find((key: any) => key.name === "Test Key 1");
      expect(createdKey).toBeDefined();
      expect(createdKey.keyPrefix).toBeDefined();
      expect(createdKey.keyLastFour).toBeDefined();
    });

    test("should require name when generating API key", async () => {
      const res = await agent.post("/api/settings/api-keys/generate").send({});
      expect(res.status).toBe(400);
    });

    test("should reject duplicate key names", async () => {
      await agent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Duplicate Name Test" });

      const duplicateRes = await agent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Duplicate Name Test" });

      expect(duplicateRes.status).toBe(409);
    });

    test("should support multiple active API keys", async () => {
      const key1Res = await agent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Multi Key A" });
      expect(key1Res.status).toBe(201);

      const key2Res = await agent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Multi Key B" });
      expect(key2Res.status).toBe(201);

      const listRes = await agent.get("/api/settings/api-keys");
      const keyA = listRes.body.keys.find((k: any) => k.name === "Multi Key A");
      const keyB = listRes.body.keys.find((k: any) => k.name === "Multi Key B");
      expect(keyA).toBeDefined();
      expect(keyB).toBeDefined();
    });

    test("should delete API key from database", async () => {
      const generateRes = await agent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Delete Me Key" });
      expect(generateRes.status).toBe(201);

      const beforeDelete = await agent.get("/api/settings/api-keys");
      const keyToDelete = beforeDelete.body.keys.find((key: any) => key.name === "Delete Me Key");
      expect(keyToDelete).toBeDefined();

      const deleteRes = await agent.delete(`/api/settings/api-keys/${keyToDelete.id}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const afterDelete = await agent.get("/api/settings/api-keys");
      const deletedKey = afterDelete.body.keys.find((key: any) => key.name === "Delete Me Key");
      expect(deletedKey).toBeUndefined();
    });

    test("should require authentication for API key routes", async () => {
      const freshAgent = request.agent(app);
      const listRes = await freshAgent.get("/api/settings/api-keys");
      expectUnauthorized(listRes);

      const generateRes = await freshAgent
        .post("/api/settings/api-keys/generate")
        .send({ name: "Unauth Key" });
      expectUnauthorized(generateRes);

      const deleteRes = await freshAgent.delete("/api/settings/api-keys/1");
      expectUnauthorized(deleteRes);
    });
  });

});
