import { Router } from 'express';
import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { eq, desc, count } from 'drizzle-orm';
import { createExpenseSchema, updateExpenseSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { getCurrentTimestamp } from '../utils/time.js';

const router = Router();

// GET /api/projects/:projectId/expenses
router.get('/projects/:projectId/expenses', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSizeParam = parseInt(req.query.page_size as string) || 25;
    const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25;
    const offset = (page - 1) * pageSize;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(expenses)
      .where(eq(expenses.projectId, projectId));

    const total = totalResult.count;

    // Get paginated expenses sorted by expenseDate DESC
    const expenseList = await db
      .select()
      .from(expenses)
      .where(eq(expenses.projectId, projectId))
      .orderBy(desc(expenses.expenseDate))
      .limit(pageSize)
      .offset(offset);

    res.json({
      data: expenseList,
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

// POST /api/projects/:projectId/expenses
router.post('/projects/:projectId/expenses', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const data = createExpenseSchema.parse(req.body);

    const [newExpense] = await db
      .insert(expenses)
      .values({
        projectId,
        expenseDate: data.expenseDate,
        description: data.description,
        amount: data.amount,
        isBillable: data.isBillable,
        isInvoiced: false,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .returning();

    res.status(201).json(newExpense);
  } catch (error) {
    next(error);
  }
});

// PUT /api/expenses/:id
router.put('/expenses/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateExpenseSchema.parse(req.body);

    const [updated] = await db
      .update(expenses)
      .set({
        ...data,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(expenses.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/expenses/:id
router.delete('/expenses/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Check if expense is invoiced
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.isInvoiced) {
      return res.status(409).json({
        error: 'Cannot delete invoiced expense',
      });
    }

    await db.delete(expenses).where(eq(expenses.id, id));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
