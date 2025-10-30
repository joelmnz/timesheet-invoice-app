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
});
