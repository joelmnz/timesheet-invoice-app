import { Router } from 'express';
import { requireApiKey } from '../middleware/apiKeyAuth.js';
import {
  getOutstandingInvoices,
  getUninvoicedExpensesByProject,
  getUninvoicedHoursByProject,
} from '../services/dashboardData.js';

const router = Router();

router.use(requireApiKey);

// GET /api/integration/fetchOutstandingInvoices
router.get('/fetchOutstandingInvoices', async (_req, res, next) => {
  try {
    const outstandingInvoices = await getOutstandingInvoices();
    return res.json({
      data: outstandingInvoices,
      count: outstandingInvoices.length,
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/integration/fetchUninvoicedItems
router.get('/fetchUninvoicedItems', async (_req, res, next) => {
  try {
    const [uninvoicedHours, uninvoicedExpenses] = await Promise.all([
      getUninvoicedHoursByProject(),
      getUninvoicedExpensesByProject(),
    ]);

    return res.json({
      hours: uninvoicedHours,
      expenses: uninvoicedExpenses,
      totals: {
        totalHours: uninvoicedHours.reduce((sum, row) => sum + row.totalHours, 0),
        totalHoursAmount: uninvoicedHours.reduce((sum, row) => sum + row.totalAmount, 0),
        totalExpensesAmount: uninvoicedExpenses.reduce((sum, row) => sum + row.totalAmount, 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
