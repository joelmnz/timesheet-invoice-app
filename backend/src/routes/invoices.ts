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
import { eq, and, lte, sql } from 'drizzle-orm';
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

    const results = await query.orderBy(sql`${invoices.dateInvoiced} DESC`);

    const response = results.map(({ invoice, client, project }) => ({
      ...invoice,
      client,
      project,
    }));

    res.json(response);
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

    // If status is being set to Paid and datePaid is not provided, set it to today
    if (data.status === 'Paid' && !data.datePaid) {
      data.datePaid = DateTime.now().toISODate()!;
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

    // Check if invoice is paid
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'Paid') {
      return res.status(409).json({
        error: 'Cannot delete paid invoice',
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

    const quantity = data.quantity ?? currentLine.quantity;
    const unitPrice = data.unitPrice ?? currentLine.unitPrice;
    const amount = roundToCents(quantity * unitPrice);

    const [updated] = await db
      .update(invoiceLineItems)
      .set({
        description: data.description,
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

    // Format filename
    const dateStr = invoice.dateInvoiced.replace(/-/g, '_');
    const clientName = client.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${invoice.number}_${clientName}_${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
