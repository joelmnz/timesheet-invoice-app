import { Router } from 'express';
import { db } from '../db/index.js';
import {
  invoices,
  timeEntries,
} from '../db/schema.js';
import { and, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { getLastNMonths } from '../utils/time.js';
import { getDashboardSummaryData } from '../services/dashboardData.js';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const summary = await getDashboardSummaryData();
    res.json(summary);
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
          sql`${invoices.dateInvoiced} <= ${end}`,
          sql`${invoices.status} != 'Cancelled'`
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
