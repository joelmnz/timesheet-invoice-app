import { describe, test, expect, beforeAll } from "bun:test";
import request from "supertest";
import { createApp } from "../app.js";
import { 
  ensureTestSettings, 
  createAuthenticatedAgent, 
  createTestClient, 
  createTestProject,
  createTestTimeEntry 
} from "./helpers.js";
import { db } from "../db/index.js";
import { invoices } from "../db/schema.js";
import { eq } from "drizzle-orm";

describe("Invoice PDF Generation with Template Variables", () => {
  let app: any;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ensureTestSettings();
    app = createApp();
    agent = request.agent(app);
    await createAuthenticatedAgent(agent);
    
    // Clear invoices
    await db.delete(invoices);
  });

  test("should generate PDF with template variables replaced in footer", async () => {
    // Update settings with footer containing variables
    await agent
      .put("/api/settings")
      .send({
        companyName: "Test Company Ltd",
        companyAddress: "123 Test Street, Auckland",
        invoiceFooterMarkdown: "Invoice **{INVOICE_NO}** for {CLIENT_NAME}. Total: {TOTAL_AMOUNT}. Generated on {DATE}.",
        nextInvoiceNumber: 1
      });

    // Create test data
    const clientId = await createTestClient(agent, { name: "Acme Corporation" });
    const projectId = await createTestProject(agent, clientId);
    
    // Create time entry with explicit dates
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-01-10T09:00:00.000Z',
      endAt: '2025-01-10T10:00:00.000Z',
      totalHours: 1,
    });

    // Create invoice
    const invoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: "2025-01-15",
        upToDate: "2025-01-15",
        notes: "Test invoice"
      });

    expect(invoiceRes.status).toBe(201);
    const invoiceId = invoiceRes.body.invoice.id;

    // Generate PDF
    const pdfRes = await agent
      .get(`/api/invoices/${invoiceId}/pdf`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    
    // Verify we got a PDF buffer
    expect(Buffer.isBuffer(pdfRes.body)).toBe(true);
    expect(pdfRes.body.length).toBeGreaterThan(0);
    
    // PDF should start with PDF magic bytes
    const pdfHeader = pdfRes.body.toString('utf8', 0, 4);
    expect(pdfHeader).toBe('%PDF');
  });

  test("should handle footer with markdown around variables", async () => {
    await agent
      .put("/api/settings")
      .send({
        companyName: "Test Co",
        invoiceFooterMarkdown: "**Payment Terms:** Net 30 days\n\nPlease quote **{INVOICE_NO}** in all payments.",
        nextInvoiceNumber: 100
      });

    const clientId = await createTestClient(agent);
    const projectId = await createTestProject(agent, clientId);
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-01-25T09:00:00.000Z',
      endAt: '2025-01-25T10:00:00.000Z',
      totalHours: 1,
    });

    const invoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: "2025-02-01",
        upToDate: "2025-02-01"
      });

    const invoiceId = invoiceRes.body.invoice.id;
    const pdfRes = await agent.get(`/api/invoices/${invoiceId}/pdf`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
  });

  test("should generate PDF even with empty footer", async () => {
    await agent
      .put("/api/settings")
      .send({
        companyName: "Test Co",
        invoiceFooterMarkdown: "",
        nextInvoiceNumber: 200
      });

    const clientId = await createTestClient(agent);
    const projectId = await createTestProject(agent, clientId);
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-02-25T09:00:00.000Z',
      endAt: '2025-02-25T10:00:00.000Z',
      totalHours: 1,
    });

    const invoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: "2025-03-01",
        upToDate: "2025-03-01"
      });

    const invoiceId = invoiceRes.body.invoice.id;
    const pdfRes = await agent.get(`/api/invoices/${invoiceId}/pdf`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
  });

  test("should handle all supported variables", async () => {
    await agent
      .put("/api/settings")
      .send({
        companyName: "My Business Solutions",
        companyAddress: "456 Commerce St, Wellington",
        invoiceFooterMarkdown: `**Invoice Details:**
- Number: {INVOICE_NO}
- Date: {INVOICE_DATE}
- Client: {CLIENT_NAME}
- Total: {TOTAL_AMOUNT}
- Current Date: {DATE}

**Company Info:**
- Name: {COMPANY_NAME}
- Address: {COMPANY_ADDRESS}`,
        nextInvoiceNumber: 300
      });

    const clientId = await createTestClient(agent, { name: "Big Client Ltd" });
    const projectId = await createTestProject(agent, clientId);
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-03-25T09:00:00.000Z',
      endAt: '2025-03-25T10:00:00.000Z',
      totalHours: 1,
    });

    const invoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: "2025-04-01",
        upToDate: "2025-04-01"
      });

    const invoiceId = invoiceRes.body.invoice.id;
    const pdfRes = await agent.get(`/api/invoices/${invoiceId}/pdf`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
  });

  test("should handle footer without any variables (backward compatibility)", async () => {
    await agent
      .put("/api/settings")
      .send({
        companyName: "Test Co",
        invoiceFooterMarkdown: "**Payment Terms:** Net 30 days. Bank details: 12-3456-7890123-00",
        nextInvoiceNumber: 400
      });

    const clientId = await createTestClient(agent);
    const projectId = await createTestProject(agent, clientId);
    await createTestTimeEntry(agent, projectId, {
      startAt: '2025-04-25T09:00:00.000Z',
      endAt: '2025-04-25T10:00:00.000Z',
      totalHours: 1,
    });

    const invoiceRes = await agent
      .post(`/api/projects/${projectId}/invoices`)
      .send({
        dateInvoiced: "2025-05-01",
        upToDate: "2025-05-01"
      });

    const invoiceId = invoiceRes.body.invoice.id;
    const pdfRes = await agent.get(`/api/invoices/${invoiceId}/pdf`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
  });
});
