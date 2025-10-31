import { describe, test, expect } from "bun:test";
import { replaceTemplateVariables, buildInvoiceTemplateVariables } from "../utils/template.js";

describe("Template Variable Replacement", () => {
  describe("replaceTemplateVariables", () => {
    test("should replace a single variable", () => {
      const text = "Invoice number: {INVOICE_NO}";
      const result = replaceTemplateVariables(text, { INVOICE_NO: "INV-0001" });
      expect(result).toBe("Invoice number: INV-0001");
    });

    test("should replace multiple variables", () => {
      const text = "Invoice {INVOICE_NO} for {CLIENT_NAME}";
      const result = replaceTemplateVariables(text, { 
        INVOICE_NO: "INV-0001",
        CLIENT_NAME: "Acme Corp"
      });
      expect(result).toBe("Invoice INV-0001 for Acme Corp");
    });

    test("should replace the same variable multiple times", () => {
      const text = "{INVOICE_NO} - Please quote {INVOICE_NO} in all payments";
      const result = replaceTemplateVariables(text, { INVOICE_NO: "INV-0001" });
      expect(result).toBe("INV-0001 - Please quote INV-0001 in all payments");
    });

    test("should work with markdown formatting around variables", () => {
      const text = "Please quote **{INVOICE_NO}** in payments";
      const result = replaceTemplateVariables(text, { INVOICE_NO: "INV-0001" });
      expect(result).toBe("Please quote **INV-0001** in payments");
    });

    test("should handle empty text", () => {
      const result = replaceTemplateVariables("", { INVOICE_NO: "INV-0001" });
      expect(result).toBe("");
    });

    test("should handle null/undefined variables gracefully", () => {
      const text = "Invoice {INVOICE_NO} for {CLIENT_NAME}";
      const result = replaceTemplateVariables(text, { INVOICE_NO: "INV-0001" });
      expect(result).toBe("Invoice INV-0001 for {CLIENT_NAME}");
    });

    test("should handle text with no variables", () => {
      const text = "No variables here";
      const result = replaceTemplateVariables(text, { INVOICE_NO: "INV-0001" });
      expect(result).toBe("No variables here");
    });

    test("should handle empty variables object", () => {
      const text = "Invoice {INVOICE_NO}";
      const result = replaceTemplateVariables(text, {});
      expect(result).toBe("Invoice {INVOICE_NO}");
    });

    test("should preserve whitespace and formatting", () => {
      const text = "  Invoice: {INVOICE_NO}\n  Client: {CLIENT_NAME}  ";
      const result = replaceTemplateVariables(text, { 
        INVOICE_NO: "INV-0001",
        CLIENT_NAME: "Acme"
      });
      expect(result).toBe("  Invoice: INV-0001\n  Client: Acme  ");
    });

    test("should handle special characters in variable values", () => {
      const text = "Address: {COMPANY_ADDRESS}";
      const result = replaceTemplateVariables(text, { 
        COMPANY_ADDRESS: "123 Main St, Suite #4"
      });
      expect(result).toBe("Address: 123 Main St, Suite #4");
    });

    test("should be case-sensitive for variable names", () => {
      const text = "{invoice_no} {INVOICE_NO}";
      const result = replaceTemplateVariables(text, { INVOICE_NO: "INV-0001" });
      expect(result).toBe("{invoice_no} INV-0001");
    });
  });

  describe("buildInvoiceTemplateVariables", () => {
    test("should always include current DATE", () => {
      const vars = buildInvoiceTemplateVariables({});
      expect(vars.DATE).toBeDefined();
      // Should match format like "31 Oct 2025"
      expect(vars.DATE).toMatch(/^\d{2} \w{3} \d{4}$/);
    });

    test("should format INVOICE_DATE correctly", () => {
      const vars = buildInvoiceTemplateVariables({
        invoiceDate: "2025-01-15"
      });
      expect(vars.INVOICE_DATE).toBe("15 Jan 2025");
    });

    test("should include invoice number", () => {
      const vars = buildInvoiceTemplateVariables({
        invoiceNumber: "INV-0042"
      });
      expect(vars.INVOICE_NO).toBe("INV-0042");
    });

    test("should include client name", () => {
      const vars = buildInvoiceTemplateVariables({
        clientName: "Acme Corporation"
      });
      expect(vars.CLIENT_NAME).toBe("Acme Corporation");
    });

    test("should format total amount with currency", () => {
      const vars = buildInvoiceTemplateVariables({
        totalAmount: 1234.56
      });
      expect(vars.TOTAL_AMOUNT).toBe("NZD 1234.56");
    });

    test("should format total amount with two decimal places", () => {
      const vars = buildInvoiceTemplateVariables({
        totalAmount: 100
      });
      expect(vars.TOTAL_AMOUNT).toBe("NZD 100.00");
    });

    test("should build PERIOD from start and end dates", () => {
      const vars = buildInvoiceTemplateVariables({
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31"
      });
      expect(vars.PERIOD).toBe("01 Jan 2025 - 31 Jan 2025");
    });

    test("should not include PERIOD if only start date provided", () => {
      const vars = buildInvoiceTemplateVariables({
        periodStart: "2025-01-01"
      });
      expect(vars.PERIOD).toBeUndefined();
    });

    test("should not include PERIOD if only end date provided", () => {
      const vars = buildInvoiceTemplateVariables({
        periodEnd: "2025-01-31"
      });
      expect(vars.PERIOD).toBeUndefined();
    });

    test("should include company name", () => {
      const vars = buildInvoiceTemplateVariables({
        companyName: "My Business Ltd"
      });
      expect(vars.COMPANY_NAME).toBe("My Business Ltd");
    });

    test("should include company address", () => {
      const vars = buildInvoiceTemplateVariables({
        companyAddress: "123 Main St, Auckland"
      });
      expect(vars.COMPANY_ADDRESS).toBe("123 Main St, Auckland");
    });

    test("should build complete set of variables", () => {
      const vars = buildInvoiceTemplateVariables({
        invoiceNumber: "INV-0001",
        invoiceDate: "2025-01-15",
        clientName: "Acme Corp",
        totalAmount: 1500.00,
        periodStart: "2025-01-01",
        periodEnd: "2025-01-15",
        companyName: "My Business",
        companyAddress: "456 Business Ave"
      });

      expect(vars.DATE).toBeDefined();
      expect(vars.INVOICE_DATE).toBe("15 Jan 2025");
      expect(vars.INVOICE_NO).toBe("INV-0001");
      expect(vars.CLIENT_NAME).toBe("Acme Corp");
      expect(vars.TOTAL_AMOUNT).toBe("NZD 1500.00");
      expect(vars.PERIOD).toBe("01 Jan 2025 - 15 Jan 2025");
      expect(vars.COMPANY_NAME).toBe("My Business");
      expect(vars.COMPANY_ADDRESS).toBe("456 Business Ave");
    });
  });

  describe("Integration - Template replacement with invoice variables", () => {
    test("should work end-to-end with real invoice data", () => {
      const template = "Invoice **{INVOICE_NO}** dated {INVOICE_DATE} for {CLIENT_NAME}. Total: {TOTAL_AMOUNT}. Payment terms: Net 30 days.";
      
      const variables = buildInvoiceTemplateVariables({
        invoiceNumber: "INV-0123",
        invoiceDate: "2025-02-01",
        clientName: "Test Client Ltd",
        totalAmount: 2500.50
      });

      const result = replaceTemplateVariables(template, variables);
      
      expect(result).toBe("Invoice **INV-0123** dated 01 Feb 2025 for Test Client Ltd. Total: NZD 2500.50. Payment terms: Net 30 days.");
    });

    test("should handle complex markdown template", () => {
      const template = `**Payment Terms:** Net 30 days

Please quote invoice number **{INVOICE_NO}** on all payments.

For queries, contact {COMPANY_NAME} at the address below.`;
      
      const variables = buildInvoiceTemplateVariables({
        invoiceNumber: "INV-0456",
        companyName: "Business Solutions Ltd"
      });

      const result = replaceTemplateVariables(template, variables);
      
      expect(result).toContain("**INV-0456**");
      expect(result).toContain("Business Solutions Ltd");
    });
  });
});
