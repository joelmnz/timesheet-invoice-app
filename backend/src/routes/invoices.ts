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

// POST /api/projects/:id/invoices
router.post('/projects/:id/invoices', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const { dateInvoiced, upToDate, notes, groupByDay = false } = createInvoiceSchema.parse(req.body);

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get uninvoiced time entries up to date
    const uninvoicedTime = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          eq(timeEntries.isInvoiced, false),
          lte(timeEntries.startAt, upToDate),
          sql`${timeEntries.endAt} IS NOT NULL`
        )
      )
      .orderBy(timeEntries.startAt);

    // Get uninvoiced billable expenses up to date
    const uninvoicedExpenses = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.projectId, projectId),
          eq(expenses.isInvoiced, false),
          eq(expenses.isBillable, true),
          lte(expenses.expenseDate, upToDate)
        )
      )
      .orderBy(expenses.expenseDate);

    if (uninvoicedTime.length === 0 && uninvoicedExpenses.length === 0) {
      return res.status(400).json({
        error: 'No uninvoiced time entries or expenses found for this project',
      });
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get and increment invoice number
      const [settingsData] = await tx
        .select()
        .from(settings)
        .where(eq(settings.id, 1))
        .limit(1);

      const invoiceNumber = formatInvoiceNumber(settingsData.nextInvoiceNumber);

      await tx
        .update(settings)
        .set({
          nextInvoiceNumber: settingsData.nextInvoiceNumber + 1,
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(settings.id, 1));

      // Calculate due date
      const dueDate = calculateDueDate(dateInvoiced);

      // Create invoice
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          number: invoiceNumber,
          clientId: project.clientId,
          projectId,
          dateInvoiced,
          dueDate,
          status: 'Unpaid',
          subtotal: 0,
          total: 0,
          notes,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        })
        .returning();

      const lineItems = [];

      // Add time entries as line items
      if (groupByDay) {
        // Group by day
        const groupedByDay = uninvoicedTime.reduce((acc, entry) => {
          const date = DateTime.fromISO(entry.startAt).toISODate()!;
          if (!acc[date]) {
            acc[date] = { hours: 0, entries: [] };
          }
          acc[date].hours += entry.totalHours;
          acc[date].entries.push(entry);
          return acc;
        }, {} as Record<string, { hours: number; entries: typeof uninvoicedTime }>);

        for (const [date, { hours, entries }] of Object.entries(groupedByDay)) {
          const amount = roundToCents(hours * project.hourlyRate);
          const [lineItem] = await tx
            .insert(invoiceLineItems)
            .values({
              invoiceId: newInvoice.id,
              type: 'time',
              description: `Time entries for ${date}`,
              quantity: hours,
              unitPrice: project.hourlyRate,
              amount,
              createdAt: getCurrentTimestamp(),
              updatedAt: getCurrentTimestamp(),
            })
            .returning();
          lineItems.push(lineItem);

          // Mark time entries as invoiced
          for (const entry of entries) {
            await tx
              .update(timeEntries)
              .set({
                isInvoiced: true,
                invoiceId: newInvoice.id,
                updatedAt: getCurrentTimestamp(),
              })
              .where(eq(timeEntries.id, entry.id));
          }
        }
      } else {
        // One line per entry
        for (const entry of uninvoicedTime) {
          const date = DateTime.fromISO(entry.startAt).toISODate();
          const description = entry.note 
            ? `${date} - ${entry.note}` 
            : `Time entry - ${date}`;
          const amount = roundToCents(entry.totalHours * project.hourlyRate);

          const [lineItem] = await tx
            .insert(invoiceLineItems)
            .values({
              invoiceId: newInvoice.id,
              type: 'time',
              description,
              quantity: entry.totalHours,
              unitPrice: project.hourlyRate,
              amount,
              linkedTimeEntryId: entry.id,
              createdAt: getCurrentTimestamp(),
              updatedAt: getCurrentTimestamp(),
            })
            .returning();
          lineItems.push(lineItem);

          // Mark as invoiced
          await tx
            .update(timeEntries)
            .set({
              isInvoiced: true,
              invoiceId: newInvoice.id,
              updatedAt: getCurrentTimestamp(),
            })
            .where(eq(timeEntries.id, entry.id));
        }
      }

      // Add expenses as line items
      for (const expense of uninvoicedExpenses) {
        const [lineItem] = await tx
          .insert(invoiceLineItems)
          .values({
            invoiceId: newInvoice.id,
            type: 'expense',
            description: expense.description || `Expense - ${expense.expenseDate}`,
            quantity: 1,
            unitPrice: expense.amount,
            amount: expense.amount,
            linkedExpenseId: expense.id,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
          })
          .returning();
        lineItems.push(lineItem);

        // Mark as invoiced
        await tx
          .update(expenses)
          .set({
            isInvoiced: true,
            invoiceId: newInvoice.id,
            updatedAt: getCurrentTimestamp(),
          })
          .where(eq(expenses.id, expense.id));
      }

      // Calculate totals
      const subtotal = roundToCents(
        lineItems.reduce((sum, item) => sum + item.amount, 0)
      );

      // Update invoice with totals
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          subtotal,
          total: subtotal,
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(invoices.id, newInvoice.id))
        .returning();

      return { invoice: updatedInvoice, lineItems };
    });

    res.status(201).json(result);
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
router.put('/invoice-lines/:lineId', requireAuth, async (req, res, next) => {
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
router.delete('/invoice-lines/:lineId', requireAuth, async (req, res, next) => {
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
