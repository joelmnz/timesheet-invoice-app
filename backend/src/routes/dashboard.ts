import { Router } from 'express';
import { db } from '../db/index.js';
import { 
  timeEntries, 
  expenses, 
  invoices, 
  projects, 
  clients 
} from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { calculateDaysOverdue, getLastNMonths } from '../utils/time.js';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    // Uninvoiced hours by project
    const uninvoicedHoursRaw = await db
      .select({
        projectId: timeEntries.projectId,
        projectName: projects.name,
        clientId: clients.id,
        clientName: clients.name,
        totalHours: sql<number>`SUM(${timeEntries.totalHours})`,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(timeEntries.isInvoiced, false),
          sql`${timeEntries.endAt} IS NOT NULL`
        )
      )
      .groupBy(timeEntries.projectId, projects.name, clients.id, clients.name);

    // Uninvoiced expenses by project
    const uninvoicedExpensesRaw = await db
      .select({
        projectId: expenses.projectId,
        projectName: projects.name,
        clientName: clients.name,
        totalAmount: sql<number>`SUM(${expenses.amount})`,
      })
      .from(expenses)
      .innerJoin(projects, eq(expenses.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(expenses.isInvoiced, false),
          eq(expenses.isBillable, true)
        )
      )
      .groupBy(expenses.projectId, projects.name, clients.name);

    // Outstanding invoices
    const outstandingInvoicesRaw = await db
      .select({
        invoice: invoices,
        clientName: clients.name,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.status, 'Unpaid'))
      .orderBy(invoices.dueDate);

    const outstandingInvoices = outstandingInvoicesRaw.map(({ invoice, clientName }) => ({
      id: invoice.id,
      number: invoice.number,
      dateInvoiced: invoice.dateInvoiced,
      dueDate: invoice.dueDate,
      clientName,
      total: invoice.total,
      daysOverdue: calculateDaysOverdue(invoice.dueDate),
    }));

    res.json({
      uninvoicedHoursByProject: uninvoicedHoursRaw,
      uninvoicedExpensesByProject: uninvoicedExpensesRaw,
      outstandingInvoices,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/charts/invoiced-by-month
router.get('/invoiced-by-month', requireAuth, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months as string) || 12;
    const { start, end } = getLastNMonths(months);

    const data = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${invoices.dateInvoiced})`,
        total: sql<number>`SUM(${invoices.total})`,
      })
      .from(invoices)
      .where(
        and(
          sql`${invoices.dateInvoiced} >= ${start}`,
          sql`${invoices.dateInvoiced} <= ${end}`
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${invoices.dateInvoiced})`)
      .orderBy(sql`strftime('%Y-%m', ${invoices.dateInvoiced})`);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/charts/hours-by-month
router.get('/hours-by-month', requireAuth, async (req, res, next) => {
  try {
    const months = parseInt(req.query.months as string) || 12;
    const { start, end } = getLastNMonths(months);

    const data = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${timeEntries.startAt})`,
        totalHours: sql<number>`SUM(${timeEntries.totalHours})`,
      })
      .from(timeEntries)
      .where(
        and(
          sql`${timeEntries.startAt} >= ${start}`,
          sql`${timeEntries.startAt} <= ${end}`,
          sql`${timeEntries.endAt} IS NOT NULL`
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${timeEntries.startAt})`)
      .orderBy(sql`strftime('%Y-%m', ${timeEntries.startAt})`);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
