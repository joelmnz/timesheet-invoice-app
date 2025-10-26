import { describe, test, expect, beforeAll } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { ensureTestSettings } from "./helpers.js";

describe("Auth Routes", () => {
  let app: any;
  let agent: request.SuperAgentTest;

  beforeAll(() => {
    ensureTestSettings();
    app = createApp();
    agent = request.agent(app);
  });

  describe("POST /api/auth/login", () => {
    test("should login with valid credentials", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, username: "admin" });
    });

    test("should reject invalid username", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "wronguser", password: "admin" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    test("should reject invalid password", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "admin", password: "wrongpass" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    test("should reject missing username", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ password: "admin" });

      expect(res.status).toBe(400);
    });

    test("should reject missing password", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "admin" });

      expect(res.status).toBe(400);
    });

    test("should reject empty username", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "", password: "admin" });

      expect(res.status).toBe(400);
    });

    test("should reject empty password", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "admin", password: "" });

      expect(res.status).toBe(400);
    });

    test("should set session cookie on successful login", async () => {
      const res = await agent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe("POST /api/auth/logout", () => {
    test("should logout successfully", async () => {
      await agent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      const res = await agent.post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    test("should clear session cookie on logout", async () => {
      await agent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      const res = await agent.post("/api/auth/logout");

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        expect(setCookie.some((cookie: string) => cookie.includes('timesheet.sid'))).toBe(true);
      }
    });

    test("should work even when not logged in", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });
  });

  describe("GET /api/auth/me", () => {
    test("should return authenticated status when logged in", async () => {
      const testAgent = request.agent(app);
      
      await testAgent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      const res = await testAgent.get("/api/auth/me");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        authenticated: true,
        username: "admin"
      });
    });

    test("should return unauthenticated status when not logged in", async () => {
      const freshAgent = request.agent(app);
      const res = await freshAgent.get("/api/auth/me");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        authenticated: false,
        username: undefined
      });
    });

    test("should return unauthenticated after logout", async () => {
      const testAgent = request.agent(app);
      
      await testAgent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      await testAgent.post("/api/auth/logout");

      const res = await testAgent.get("/api/auth/me");

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });
  });

  describe("Session Management", () => {
    test("should maintain session across requests", async () => {
      const testAgent = request.agent(app);
      
      await testAgent
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      const res1 = await testAgent.get("/api/auth/me");
      expect(res1.body.authenticated).toBe(true);

      const res2 = await testAgent.get("/api/auth/me");
      expect(res2.body.authenticated).toBe(true);
    });

    test("should not share sessions between agents", async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      await agent1
        .post("/api/auth/login")
        .send({ username: "admin", password: "admin" });

      const res1 = await agent1.get("/api/auth/me");
      expect(res1.body.authenticated).toBe(true);

      const res2 = await agent2.get("/api/auth/me");
      expect(res2.body.authenticated).toBe(false);
    });
  });
});
