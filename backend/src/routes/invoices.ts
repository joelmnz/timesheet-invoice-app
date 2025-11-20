import { Router } from 'express';
import { db } from '../db/index.js';
import {
  invoices,
  invoiceLineItems,
  timeEntries,
  expenses,
  projects,
  clients,
  settings
} from '../db/schema.js';
import { eq, and, lte, sql, count } from 'drizzle-orm';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  createInvoiceLineItemSchema,
  updateInvoiceLineItemSchema
} from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import {
  calculateDueDate,
  formatInvoiceNumber,
  roundToCents,
  getCurrentTimestamp
} from '../utils/time.js';
import { generateInvoicePdf } from '../services/pdf.js';
import { DateTime } from 'luxon';

const router = Router();
// Separate router for invoice line item operations mounted at /api/invoice-lines
export const invoiceLinesRouter = Router();

// GET /api/invoices
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, clientId, projectId, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSizeParam = parseInt(req.query.page_size as string) || 25;
    const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25;
    const offset = (page - 1) * pageSize;

    let query = db
      .select({
        invoice: invoices,
        client: clients,
        project: projects,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(projects, eq(invoices.projectId, projects.id));

    const conditions = [];

    if (status) {
      conditions.push(eq(invoices.status, status as string));
    }

    if (clientId) {
      conditions.push(eq(invoices.clientId, parseInt(clientId as string)));
    }

    if (projectId) {
      conditions.push(eq(invoices.projectId, parseInt(projectId as string)));
    }

    if (from) {
      conditions.push(sql`${invoices.dateInvoiced} >= ${from}`);
    }

    if (to) {
      conditions.push(sql`${invoices.dateInvoiced} <= ${to}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count with same conditions
    let countQuery = db
      .select({ count: count() })
      .from(invoices);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const [totalResult] = await countQuery;
    const total = totalResult.count;

    // Get paginated results sorted by dateInvoiced DESC
    const results = await query
      .orderBy(sql`${invoices.dateInvoiced} DESC`)
      .limit(pageSize)
      .offset(offset);

    const response = results.map(({ invoice, client, project }) => ({
      ...invoice,
      client,
      project,
    }));

    res.json({
      data: response,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const results = await db
      .select({
        invoice: invoices,
        client: clients,
        project: projects,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(projects, eq(invoices.projectId, projects.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { invoice, client, project } = results[0];

    res.json({
      ...invoice,
      client,
      project,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateInvoiceSchema.parse(req.body);

    // Get current invoice to check status
    const [currentInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!currentInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Enforce locking rules: only allow notes, status, dateSent, and datePaid changes for non-Draft invoices
    // UNLESS we are reverting to Draft status, in which case we allow full editing (unlocking)
    if (['Sent', 'Paid', 'Cancelled'].includes(currentInvoice.status) && data.status !== 'Draft') {
      const allowedFields = ['notes', 'status', 'dateSent', 'datePaid'];
      const providedFields = Object.keys(data);
      const invalidFields = providedFields.filter(f => !allowedFields.includes(f));

      if (invalidFields.length > 0) {
        return res.status(409).json({
          error: `Cannot modify ${invalidFields.join(', ')} for invoices with status ${currentInvoice.status}. Only notes, status, dateSent, and datePaid can be updated.`,
        });
      }
    }

    // Auto-set dateSent when status changes to Sent
    if (data.status === 'Sent' && (data.dateSent === undefined || data.dateSent === null)) {
      data.dateSent = DateTime.now().toISODate()!;
    }

    // Auto-set datePaid when status changes to Paid
    if (data.status === 'Paid' && (data.datePaid === undefined || data.datePaid === null)) {
      data.datePaid = DateTime.now().toISODate()!;
    }

    // Clear datePaid if status is changing to non-Paid and datePaid was not explicitly provided
    if (data.status && data.status !== 'Paid' && !('datePaid' in data)) {
      data.datePaid = null;
    }

    // If datePaid is being explicitly cleared (set to null) and no status is provided, set status to Draft
    // This handles the data correction workflow where clearing payment info should revert to Draft
    if ('datePaid' in data && data.datePaid === null && !data.status && currentInvoice.status === 'Paid') {
      data.status = 'Draft';
    }

    const [updated] = await db
      .update(invoices)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(invoices.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Check if invoice exists and get its status
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (['Sent', 'Paid', 'Cancelled'].includes(invoice.status)) {
      return res.status(409).json({
        error: `Cannot delete invoice with status ${invoice.status}. Only Draft invoices can be deleted.`,
      });
    }

    // Note: We do NOT auto-unmark time entries and expenses
    // The ON DELETE SET NULL will handle the foreign key
    await db.delete(invoices).where(eq(invoices.id, id));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:id/lines
router.get('/:id/lines', requireAuth, async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);

    const lines = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(invoiceLineItems.id);

    res.json(lines);
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices/:id/lines
router.post('/:id/lines', requireAuth, async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const data = createInvoiceLineItemSchema.parse(req.body);

    // Check if invoice exists and is editable
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'Draft') {
      return res.status(409).json({
        error: `Cannot add line items to invoices with status ${invoice.status}. Only Draft invoices can be modified.`,
      });
    }

    const amount = roundToCents(data.quantity * data.unitPrice);

    const [newLine] = await db
      .insert(invoiceLineItems)
      .values({
        invoiceId,
        type: data.type,
        description: data.description,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        amount,
        linkedTimeEntryId: data.linkedTimeEntryId,
        linkedExpenseId: data.linkedExpenseId,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .returning();

    // Recalculate invoice totals
    await recalculateInvoiceTotals(invoiceId);

    res.status(201).json(newLine);
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoice-lines/:lineId
invoiceLinesRouter.put('/:lineId', requireAuth, async (req, res, next) => {
  try {
    const lineId = parseInt(req.params.lineId);
    const data = updateInvoiceLineItemSchema.parse(req.body);

    const [currentLine] = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.id, lineId))
      .limit(1);

    if (!currentLine) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    // Check if the invoice is editable
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, currentLine.invoiceId))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'Draft') {
      return res.status(409).json({
        error: `Cannot edit line items on invoices with status ${invoice.status}. Only Draft invoices can be modified.`,
      });
    }

    const quantity = data.quantity ?? currentLine.quantity;
    const unitPrice = data.unitPrice ?? currentLine.unitPrice;
    const description = data.description ?? currentLine.description;
    const amount = roundToCents(quantity * unitPrice);

    // If this is a time entry line item, update the linked time entry
    if (currentLine.type === 'time' && currentLine.linkedTimeEntryId) {
      await db
        .update(timeEntries)
        .set({
          totalHours: quantity,
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(timeEntries.id, currentLine.linkedTimeEntryId));
    }

    // If this is an expense line item, update the linked expense
    if (currentLine.type === 'expense' && currentLine.linkedExpenseId) {
      await db
        .update(expenses)
        .set({
          amount: amount,
          description: description,
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(expenses.id, currentLine.linkedExpenseId));
    }

    const [updated] = await db
      .update(invoiceLineItems)
      .set({
        description,
        quantity,
        unitPrice,
        amount,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(invoiceLineItems.id, lineId))
      .returning();

    // Recalculate invoice totals
    await recalculateInvoiceTotals(currentLine.invoiceId);

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/invoice-lines/:lineId
invoiceLinesRouter.delete('/:lineId', requireAuth, async (req, res, next) => {
  try {
    const lineId = parseInt(req.params.lineId);

    const [line] = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.id, lineId))
      .limit(1);

    if (!line) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    // Check if the invoice is editable
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, line.invoiceId))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'Draft') {
      return res.status(409).json({
        error: `Cannot delete line items from invoices with status ${invoice.status}. Only Draft invoices can be modified.`,
      });
    }

    // If this is a time entry line item, unlink the time entry
    if (line.type === 'time' && line.linkedTimeEntryId) {
      await db
        .update(timeEntries)
        .set({
          isInvoiced: false,
          invoiceId: null,
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(timeEntries.id, line.linkedTimeEntryId));
    }

    // If this is an expense line item, unlink the expense
    if (line.type === 'expense' && line.linkedExpenseId) {
      await db
        .update(expenses)
        .set({
          isInvoiced: false,
          invoiceId: null,
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(expenses.id, line.linkedExpenseId));
    }

    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, lineId));

    // Recalculate invoice totals
    await recalculateInvoiceTotals(line.invoiceId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Get invoice details
    const results = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { invoice, client } = results[0];

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(id);

    // Format filename: "INV-001 - Client Name.pdf"
    // Remove special characters from client name, preserve spaces, collapse multiple spaces
    const clientName = client.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const filename = `${invoice.number} - ${clientName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Helper function to recalculate invoice totals
async function recalculateInvoiceTotals(invoiceId: number) {
  const lines = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  const subtotal = roundToCents(
    lines.reduce((sum, line) => sum + line.amount, 0)
  );

  await db
    .update(invoices)
    .set({
      subtotal,
      total: subtotal,
      updatedAt: getCurrentTimestamp(),
    })
    .where(eq(invoices.id, invoiceId));
}

export default router;
