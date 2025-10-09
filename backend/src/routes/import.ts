import { Router } from 'express';
import { db } from '../db/index.js';
import { invoices as invoicesTable, invoiceLineItems, clients, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { importInvoicesSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { parseCSV, generateCSV } from '../services/csv.js';
import { DateTime } from 'luxon';
import { roundToCents } from '../utils/time.js';

const router = Router();

interface ImportInvoiceRow {
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  amount: number;
  datePaid: string | null;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportPreview {
  valid: boolean;
  invoices: ImportInvoiceRow[];
  errors: ValidationError[];
}

// POST /api/import/invoices/validate
router.post('/invoices/validate', requireAuth, async (req, res, next) => {
  try {
    const { csvContent } = importInvoicesSchema.parse(req.body);
    
    const { headers, rows } = parseCSV(csvContent);
    
    // Validate headers (case-insensitive, trimmed)
    const expectedHeaders = [
      'Invoice Number',
      'Invoice Date',
      'Invoice Line Description',
      'Invoice Amount',
      'Date Invoice Paid'
    ];
    
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const expectedNormalized = expectedHeaders.map(h => h.toLowerCase());
    
    const headerMismatch = expectedNormalized.some((expected, idx) => 
      normalizedHeaders[idx] !== expected
    );
    
    if (headerMismatch || headers.length !== expectedHeaders.length) {
      return res.status(400).json({
        valid: false,
        errors: [{
          row: 0,
          field: 'headers',
          message: `Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`
        }]
      });
    }
    
    const invoices: ImportInvoiceRow[] = [];
    const errors: ValidationError[] = [];
    const seenInvoiceNumbers = new Set<string>();
    
    // Get existing invoice numbers from database
    const existingInvoices = await db.select({ number: invoicesTable.number }).from(invoicesTable);
    const existingNumbers = new Set(existingInvoices.map(inv => inv.number));
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is headers, and we're 0-indexed
      
      const invoiceNumber = row[0]?.trim() || '';
      const invoiceDate = row[1]?.trim() || '';
      const description = row[2]?.trim() || '';
      const amountStr = row[3]?.trim() || '';
      const datePaid = row[4]?.trim() || null;
      
      // Validate invoice number
      if (!invoiceNumber) {
        errors.push({
          row: rowNum,
          field: 'Invoice Number',
          message: 'Invoice number is required'
        });
        continue;
      }
      
      // Check for duplicate invoice numbers in CSV
      if (seenInvoiceNumbers.has(invoiceNumber)) {
        errors.push({
          row: rowNum,
          field: 'Invoice Number',
          message: `Duplicate invoice number: ${invoiceNumber}`
        });
        continue;
      }
      
      // Check if invoice number already exists in database
      if (existingNumbers.has(invoiceNumber)) {
        errors.push({
          row: rowNum,
          field: 'Invoice Number',
          message: `Invoice number already exists: ${invoiceNumber}`
        });
        continue;
      }
      
      seenInvoiceNumbers.add(invoiceNumber);
      
      // Validate invoice date
      if (!invoiceDate) {
        errors.push({
          row: rowNum,
          field: 'Invoice Date',
          message: 'Invoice date is required'
        });
        continue;
      }
      
      const parsedDate = DateTime.fromISO(invoiceDate);
      if (!parsedDate.isValid) {
        errors.push({
          row: rowNum,
          field: 'Invoice Date',
          message: `Invalid date format: ${invoiceDate}. Use YYYY-MM-DD`
        });
        continue;
      }
      
      // Validate description
      if (!description) {
        errors.push({
          row: rowNum,
          field: 'Invoice Line Description',
          message: 'Description is required'
        });
        continue;
      }
      
      // Validate amount
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount < 0) {
        errors.push({
          row: rowNum,
          field: 'Invoice Amount',
          message: `Invalid amount: ${amountStr}`
        });
        continue;
      }
      
      // Validate date paid (optional)
      let validatedDatePaid: string | null = null;
      if (datePaid && datePaid.trim() !== '') {
        const parsedPaidDate = DateTime.fromISO(datePaid);
        if (!parsedPaidDate.isValid) {
          errors.push({
            row: rowNum,
            field: 'Date Invoice Paid',
            message: `Invalid date format: ${datePaid}. Use YYYY-MM-DD`
          });
          continue;
        }
        validatedDatePaid = datePaid;
      }
      
      invoices.push({
        invoiceNumber,
        invoiceDate,
        description,
        amount: roundToCents(amount),
        datePaid: validatedDatePaid
      });
    }
    
    const preview: ImportPreview = {
      valid: errors.length === 0,
      invoices,
      errors
    };
    
    res.json(preview);
  } catch (error) {
    next(error);
  }
});

// POST /api/import/invoices/confirm
router.post('/invoices/confirm', requireAuth, async (req, res, next) => {
  try {
    const { csvContent } = importInvoicesSchema.parse(req.body);
    
    const { headers, rows } = parseCSV(csvContent);
    
    // Re-validate (same validation as preview)
    const expectedHeaders = [
      'Invoice Number',
      'Invoice Date',
      'Invoice Line Description',
      'Invoice Amount',
      'Date Invoice Paid'
    ];
    
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const expectedNormalized = expectedHeaders.map(h => h.toLowerCase());
    
    const headerMismatch = expectedNormalized.some((expected, idx) => 
      normalizedHeaders[idx] !== expected
    );
    
    if (headerMismatch || headers.length !== expectedHeaders.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`
      });
    }
    
    const importedInvoices: ImportInvoiceRow[] = [];
    const errors: ValidationError[] = [];
    const seenInvoiceNumbers = new Set<string>();
    
    const existingInvoices = await db.select({ number: invoicesTable.number }).from(invoicesTable);
    const existingNumbers = new Set(existingInvoices.map(inv => inv.number));
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      
      const invoiceNumber = row[0]?.trim() || '';
      const invoiceDate = row[1]?.trim() || '';
      const description = row[2]?.trim() || '';
      const amountStr = row[3]?.trim() || '';
      const datePaid = row[4]?.trim() || null;
      
      if (!invoiceNumber) {
        errors.push({ row: rowNum, field: 'Invoice Number', message: 'Invoice number is required' });
        continue;
      }
      
      if (seenInvoiceNumbers.has(invoiceNumber)) {
        errors.push({ row: rowNum, field: 'Invoice Number', message: `Duplicate invoice number: ${invoiceNumber}` });
        continue;
      }
      
      if (existingNumbers.has(invoiceNumber)) {
        errors.push({ row: rowNum, field: 'Invoice Number', message: `Invoice number already exists: ${invoiceNumber}` });
        continue;
      }
      
      seenInvoiceNumbers.add(invoiceNumber);
      
      if (!invoiceDate) {
        errors.push({ row: rowNum, field: 'Invoice Date', message: 'Invoice date is required' });
        continue;
      }
      
      const parsedDate = DateTime.fromISO(invoiceDate);
      if (!parsedDate.isValid) {
        errors.push({ row: rowNum, field: 'Invoice Date', message: `Invalid date format: ${invoiceDate}` });
        continue;
      }
      
      if (!description) {
        errors.push({ row: rowNum, field: 'Invoice Line Description', message: 'Description is required' });
        continue;
      }
      
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount < 0) {
        errors.push({ row: rowNum, field: 'Invoice Amount', message: `Invalid amount: ${amountStr}` });
        continue;
      }
      
      let validatedDatePaid: string | null = null;
      if (datePaid && datePaid.trim() !== '') {
        const parsedPaidDate = DateTime.fromISO(datePaid);
        if (!parsedPaidDate.isValid) {
          errors.push({ row: rowNum, field: 'Date Invoice Paid', message: `Invalid date format: ${datePaid}` });
          continue;
        }
        validatedDatePaid = datePaid;
      }
      
      importedInvoices.push({
        invoiceNumber,
        invoiceDate,
        description,
        amount: roundToCents(amount),
        datePaid: validatedDatePaid
      });
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors
      });
    }
    
    // Get default client and project for imported invoices
    // We'll need to create a default "Imported" client and project if they don't exist
    let importClient = await db.select().from(clients).where(eq(clients.name, 'Imported')).limit(1);
    
    if (importClient.length === 0) {
      const [newClient] = await db.insert(clients).values({
        name: 'Imported',
        defaultHourlyRate: 0,
        notes: 'Auto-created for invoice imports'
      }).returning();
      importClient = [newClient];
    }
    
    let importProject = await db.select().from(projects)
      .where(eq(projects.clientId, importClient[0].id))
      .limit(1);
    
    if (importProject.length === 0) {
      const [newProject] = await db.insert(projects).values({
        clientId: importClient[0].id,
        name: 'Imported Invoices',
        hourlyRate: 0,
        active: false,
        notes: 'Auto-created for invoice imports'
      }).returning();
      importProject = [newProject];
    }
    
    const clientId = importClient[0].id;
    const projectId = importProject[0].id;
    
    // Insert invoices and line items
    let successCount = 0;
    
    for (const invoice of importedInvoices) {
      const status = invoice.datePaid ? 'Paid' : 'Unpaid';
      const dueDate = invoice.invoiceDate; // Use same date as invoice date for imports
      
      const [newInvoice] = await db.insert(invoicesTable).values({
        number: invoice.invoiceNumber,
        clientId,
        projectId,
        dateInvoiced: invoice.invoiceDate,
        dueDate,
        status,
        subtotal: invoice.amount,
        total: invoice.amount,
        datePaid: invoice.datePaid,
        notes: 'Imported from CSV'
      }).returning();
      
      // Create a single line item for the invoice
      await db.insert(invoiceLineItems).values({
        invoiceId: newInvoice.id,
        type: 'manual',
        description: invoice.description,
        quantity: 1,
        unitPrice: invoice.amount,
        amount: invoice.amount
      });
      
      successCount++;
    }
    
    res.json({
      success: true,
      message: `Successfully imported ${successCount} invoice${successCount !== 1 ? 's' : ''}`,
      count: successCount
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/import/invoices/example
router.get('/invoices/example', requireAuth, async (req, res, next) => {
  try {
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Invoice Line Description',
      'Invoice Amount',
      'Date Invoice Paid'
    ];
    
    const rows = [
      ['INV-0001', '2025-01-01', 'Single line invoice description', '1234.50', '2025-01-20'],
      ['INV-002', '2025-02-01', 'Invoice Total', '300.45', '2025-02-20'],
      ['INV-003', '2025-03-01', 'Invoice Line Total', '3450', '']
    ];
    
    const csvContent = generateCSV(headers, rows);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice-import-example.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
