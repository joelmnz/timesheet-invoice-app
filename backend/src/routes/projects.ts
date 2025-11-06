import { Router } from 'express';
import { db } from '../db/index.js';
import { projects, clients, timeEntries, expenses, invoices, invoiceLineItems, settings } from '../db/schema.js';
import { eq, and, isNull, count, or, lt, gt, ne, lte, sql, desc } from 'drizzle-orm';
import { createProjectSchema, updateProjectSchema, stopTimerSchema, updateTimerNotesSchema, createInvoiceSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { roundUpToSixMinutes, getCurrentTimestamp, calculateDueDate, formatInvoiceNumber, roundToCents } from '../utils/time.js';
import { DateTime } from 'luxon';

const router = Router();

// GET /api/projects
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { active = 'all', clientId, page = '1', page_size = '25' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(page_size as string);
    const offset = (pageNum - 1) * pageSizeNum;

    let query = db
      .select({
        project: projects,
        client: clients,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id));

    const conditions = [];

    if (active === 'true') {
      conditions.push(eq(projects.active, true));
    } else if (active === 'false') {
      conditions.push(eq(projects.active, false));
    }

    if (clientId) {
      conditions.push(eq(projects.clientId, parseInt(clientId as string)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count
    let countQuery = db
      .select({ count: count() })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const [{ count: totalCount }] = await countQuery;

    // Get paginated results
    const results = await query.limit(pageSizeNum).offset(offset);

    const projectsData = results.map(({ project, client }) => ({
      ...project,
      client,
    }));

    res.json({
      data: projectsData,
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

// GET /api/projects/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    const results = await db
      .select({
        project: projects,
        client: clients,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(projects.id, id))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { project, client } = results[0];

    res.json({
      ...project,
      client,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const [newProject] = await db
      .insert(projects)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    res.status(201).json(newProject);
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateProjectSchema.parse(req.body);

    const [updated] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Check if project has time entries or expenses
    const [timeEntryCount] = await db
      .select({ count: count() })
      .from(timeEntries)
      .where(eq(timeEntries.projectId, id));

    const [expenseCount] = await db
      .select({ count: count() })
      .from(expenses)
      .where(eq(expenses.projectId, id));

    if (timeEntryCount.count > 0 || expenseCount.count > 0) {
      return res.status(409).json({
        error: 'Cannot delete project with associated time entries or expenses',
        timeEntryCount: timeEntryCount.count,
        expenseCount: expenseCount.count,
      });
    }

    await db.delete(projects).where(eq(projects.id, id));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/timer/current
router.get('/timer/current', requireAuth, async (req, res, next) => {
  try {
    const [runningTimer] = await db
      .select({
        entry: timeEntries,
        project: projects,
        client: clients,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(isNull(timeEntries.endAt))
      .limit(1);

    if (!runningTimer) {
      return res.json(null);
    }

    res.json({
      ...runningTimer.entry,
      project: runningTimer.project,
      client: runningTimer.client,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/timer/current
router.patch('/timer/current', requireAuth, async (req, res, next) => {
  try {
    const { note } = updateTimerNotesSchema.parse(req.body);

    // Find the currently running timer
    const [runningTimer] = await db
      .select()
      .from(timeEntries)
      .where(isNull(timeEntries.endAt))
      .limit(1);

    if (!runningTimer) {
      return res.status(404).json({ error: 'No running timer found' });
    }

    // Update the note field
    const [updated] = await db
      .update(timeEntries)
      .set({
        note: note || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(timeEntries.id, runningTimer.id))
      .returning();

    // Fetch with project and client info
    const [result] = await db
      .select({
        entry: timeEntries,
        project: projects,
        client: clients,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(timeEntries.id, updated.id))
      .limit(1);

    res.json({
      ...result.entry,
      project: result.project,
      client: result.client,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/timer/start
router.post('/:id/timer/start', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);

    // Check if any timer is currently running
    const runningTimer = await db
      .select()
      .from(timeEntries)
      .where(isNull(timeEntries.endAt))
      .limit(1);

    if (runningTimer.length > 0) {
      return res.status(409).json({
        error: 'Another timer is already running',
        runningEntry: runningTimer[0],
      });
    }

    // Create new time entry
    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        projectId,
        startAt: getCurrentTimestamp(),
        endAt: null,
        totalHours: 0,
        isInvoiced: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    res.status(201).json(newEntry);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/timer/stop
router.post('/:id/timer/stop', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const { clientStopAt } = stopTimerSchema.parse(req.body);

    // Find running timer for this project
    const [runningTimer] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          isNull(timeEntries.endAt)
        )
      )
      .limit(1);

    if (!runningTimer) {
      return res.status(404).json({ error: 'No running timer found for this project' });
    }

    // Calculate end time (use clientStopAt if provided and reasonable)
    let endAt = getCurrentTimestamp();
    if (clientStopAt) {
      const clientTime = new Date(clientStopAt).getTime();
      const serverTime = new Date().getTime();
      const skewTolerance = 2 * 60 * 1000; // 2 minutes

      if (clientTime <= serverTime + skewTolerance) {
        endAt = clientStopAt;
      }
    }

    // Calculate rounded hours
    const totalHours = roundUpToSixMinutes(runningTimer.startAt, endAt);

    // Check for overlaps with existing entries
    const overlaps = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          lt(timeEntries.startAt, endAt),
          gt(timeEntries.endAt, runningTimer.startAt),
          ne(timeEntries.id, runningTimer.id)
        )
      )
      .limit(1);

    if (overlaps.length > 0) {
      return res.status(409).json({
        error: 'Time entry overlaps with existing entry',
        conflictingEntry: overlaps[0],
      });
    }

    // Update the entry
    const [updated] = await db
      .update(timeEntries)
      .set({
        endAt,
        totalHours,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(timeEntries.id, runningTimer.id))
      .returning();

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/invoices
router.post('/:id/invoices', requireAuth, async (req, res, next) => {
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

    const upToDateTime = DateTime.fromISO(upToDate).endOf('day').toISO()!;

    const uninvoicedTime = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          eq(timeEntries.isInvoiced, false),
          lte(timeEntries.startAt, upToDateTime),
          sql`${timeEntries.endAt} IS NOT NULL`
        )
      )
      .orderBy(timeEntries.startAt);

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
          status: 'Draft',
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

export default router;
