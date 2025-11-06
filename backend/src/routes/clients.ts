import { Router } from 'express';
import { db } from '../db/index.js';
import { 
  clients, 
  projects, 
  timeEntries, 
  expenses, 
  invoices, 
  invoiceLineItems, 
  settings 
} from '../db/schema.js';
import { eq, like, or, count, and, lte, sql, inArray } from 'drizzle-orm';
import { 
  createClientSchema, 
  updateClientSchema, 
  createClientInvoiceSchema 
} from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { 
  calculateDueDate, 
  formatInvoiceNumber, 
  roundToCents, 
  getCurrentTimestamp 
} from '../utils/time.js';
import { DateTime } from 'luxon';

const router = Router();

// GET /api/clients
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { query, page = '1', page_size = '25' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(page_size as string);
    const offset = (pageNum - 1) * pageSizeNum;

    let queryBuilder = db.select().from(clients);
    let countBuilder = db.select({ count: count() }).from(clients);

    if (query) {
      const searchCondition = or(
        like(clients.name, `%${query}%`),
        like(clients.email, `%${query}%`),
        like(clients.contactPerson, `%${query}%`)
      );
      queryBuilder = queryBuilder.where(searchCondition) as any;
      countBuilder = countBuilder.where(searchCondition) as any;
    }

    const [{ count: totalCount }] = await countBuilder;
    const results = await queryBuilder.limit(pageSizeNum).offset(offset);

    res.json({
      data: results,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSizeNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = createClientSchema.parse(req.body);

    const [newClient] = await db
      .insert(clients)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    res.status(201).json(newClient);
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateClientSchema.parse(req.body);

    const [updated] = await db
      .update(clients)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(clients.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Check if client has projects
    const [projectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.clientId, id));

    if (projectCount.count > 0) {
      return res.status(409).json({
        error: 'Cannot delete client with associated projects',
        projectCount: projectCount.count,
      });
    }

    await db.delete(clients).where(eq(clients.id, id));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id/uninvoiced-summary
router.get('/:id/uninvoiced-summary', requireAuth, async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const { upToDate } = req.query;

    // Verify client exists
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get all projects for this client
    const clientProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientId));

    if (clientProjects.length === 0) {
      return res.json({ projects: [] });
    }

    const projectIds = clientProjects.map(p => p.id);
    const upToDateTime = upToDate 
      ? DateTime.fromISO(upToDate as string).endOf('day').toISO()!
      : DateTime.now().endOf('day').toISO()!;

    // Get uninvoiced time entries for all projects
    const uninvoicedTimeByProject = await db
      .select({
        projectId: timeEntries.projectId,
        totalHours: sql<number>`SUM(${timeEntries.totalHours})`,
      })
      .from(timeEntries)
      .where(
        and(
          inArray(timeEntries.projectId, projectIds),
          eq(timeEntries.isInvoiced, false),
          lte(timeEntries.startAt, upToDateTime),
          sql`${timeEntries.endAt} IS NOT NULL`
        )
      )
      .groupBy(timeEntries.projectId);

    // Get uninvoiced expenses for all projects
    const uninvoicedExpensesByProject = await db
      .select({
        projectId: expenses.projectId,
        totalAmount: sql<number>`SUM(${expenses.amount})`,
      })
      .from(expenses)
      .where(
        and(
          inArray(expenses.projectId, projectIds),
          eq(expenses.isInvoiced, false),
          eq(expenses.isBillable, true),
          lte(expenses.expenseDate, upToDate as string || DateTime.now().toISODate()!)
        )
      )
      .groupBy(expenses.projectId);

    // Build summary for each project
    const projectSummaries = clientProjects.map(project => {
      const timeData = uninvoicedTimeByProject.find(t => t.projectId === project.id);
      const expenseData = uninvoicedExpensesByProject.find(e => e.projectId === project.id);

      const uninvoicedHours = timeData?.totalHours || 0;
      const timeAmount = roundToCents(uninvoicedHours * project.hourlyRate);
      const expenseAmount = expenseData?.totalAmount || 0;

      return {
        projectId: project.id,
        projectName: project.name,
        hourlyRate: project.hourlyRate,
        uninvoicedHours,
        timeAmount,
        expenseAmount,
        totalAmount: roundToCents(timeAmount + expenseAmount),
      };
    });

    // Filter out projects with no uninvoiced items
    const projectsWithUninvoiced = projectSummaries.filter(
      p => p.uninvoicedHours > 0 || p.expenseAmount > 0
    );

    res.json({ projects: projectsWithUninvoiced });
  } catch (error) {
    next(error);
  }
});

// POST /api/clients/:id/invoices
router.post('/:id/invoices', requireAuth, async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.id);
    const { dateInvoiced, upToDate, notes, groupByDay = false, projectIds } = 
      createClientInvoiceSchema.parse(req.body);

    // Verify client exists
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Verify all projects belong to this client
    const selectedProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          inArray(projects.id, projectIds),
          eq(projects.clientId, clientId)
        )
      );

    if (selectedProjects.length !== projectIds.length) {
      return res.status(400).json({ 
        error: 'One or more selected projects do not belong to this client' 
      });
    }

    const upToDateTime = DateTime.fromISO(upToDate).endOf('day').toISO()!;

    // Get all uninvoiced time entries for selected projects
    const uninvoicedTime = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          inArray(timeEntries.projectId, projectIds),
          eq(timeEntries.isInvoiced, false),
          lte(timeEntries.startAt, upToDateTime),
          sql`${timeEntries.endAt} IS NOT NULL`
        )
      )
      .orderBy(timeEntries.projectId, timeEntries.startAt);

    // Get all uninvoiced expenses for selected projects
    const uninvoicedExpenses = await db
      .select()
      .from(expenses)
      .where(
        and(
          inArray(expenses.projectId, projectIds),
          eq(expenses.isInvoiced, false),
          eq(expenses.isBillable, true),
          lte(expenses.expenseDate, upToDate)
        )
      )
      .orderBy(expenses.projectId, expenses.expenseDate);

    if (uninvoicedTime.length === 0 && uninvoicedExpenses.length === 0) {
      return res.status(400).json({
        error: 'No uninvoiced time entries or expenses found for selected projects',
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

      // Create invoice (use first project's ID as the primary project)
      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          number: invoiceNumber,
          clientId,
          projectId: projectIds[0], // Use first project as primary reference
          dateInvoiced,
          dueDate,
          status: 'Draft',
          subtotal: 0,
          total: 0,
          notes,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        })
        .returning();

      const lineItems = [];

      // Group time entries by project
      const timeEntriesByProject = uninvoicedTime.reduce((acc, entry) => {
        if (!acc[entry.projectId]) {
          acc[entry.projectId] = [];
        }
        acc[entry.projectId].push(entry);
        return acc;
      }, {} as Record<number, typeof uninvoicedTime>);

      // Group expenses by project
      const expensesByProject = uninvoicedExpenses.reduce((acc, expense) => {
        if (!acc[expense.projectId]) {
          acc[expense.projectId] = [];
        }
        acc[expense.projectId].push(expense);
        return acc;
      }, {} as Record<number, typeof uninvoicedExpenses>);

      // Process each project
      for (const project of selectedProjects) {
        const projectTimeEntries = timeEntriesByProject[project.id] || [];
        const projectExpenses = expensesByProject[project.id] || [];

        if (projectTimeEntries.length === 0 && projectExpenses.length === 0) {
          continue; // Skip projects with no uninvoiced items
        }

        // Add time entries as line items
        if (groupByDay) {
          // Group by day (using UTC timezone for consistency)
          const groupedByDay = projectTimeEntries.reduce((acc, entry) => {
            const date = DateTime.fromISO(entry.startAt, { zone: 'utc' }).toISODate()!;
            if (!acc[date]) {
              acc[date] = { hours: 0, entries: [] };
            }
            acc[date].hours += entry.totalHours;
            acc[date].entries.push(entry);
            return acc;
          }, {} as Record<string, { hours: number; entries: typeof projectTimeEntries }>);

          for (const [date, { hours, entries }] of Object.entries(groupedByDay)) {
            const amount = roundToCents(hours * project.hourlyRate);
            const [lineItem] = await tx
              .insert(invoiceLineItems)
              .values({
                invoiceId: newInvoice.id,
                type: 'time',
                description: `${project.name} - Time entries for ${date}`,
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
          for (const entry of projectTimeEntries) {
            const date = DateTime.fromISO(entry.startAt, { zone: 'utc' }).toISODate();
            const description = entry.note 
              ? `${project.name} - ${date} - ${entry.note}` 
              : `${project.name} - Time entry - ${date}`;
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
        for (const expense of projectExpenses) {
          const description = expense.description 
            ? `${project.name} - ${expense.description}` 
            : `${project.name} - Expense - ${expense.expenseDate}`;

          const [lineItem] = await tx
            .insert(invoiceLineItems)
            .values({
              invoiceId: newInvoice.id,
              type: 'expense',
              description,
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

export default router;
