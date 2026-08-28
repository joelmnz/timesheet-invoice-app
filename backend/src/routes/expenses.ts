import { Router } from 'express';
import { db } from '../db/index.js';
import { clients, expenses, projects } from '../db/schema.js';
import { and, count, desc, eq, isNull, sql, sum } from 'drizzle-orm';
import { createExpenseSchema, updateExpenseSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { getCurrentTimestamp } from '../utils/time.js';
import { z } from 'zod';

const router = Router();

// GET /api/expenses (all expenses with optional filters)
router.get('/expenses', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSizeParam = parseInt(req.query.page_size as string) || 25;
    const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25;
    const offset = (page - 1) * pageSize;
    const projectFilter = req.query.projectId as string | undefined;
    const query = (req.query.query as string | undefined)?.trim();
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (projectFilter === 'general') {
      conditions.push(isNull(expenses.projectId));
    } else if (projectFilter) {
      const projectId = z.coerce.number().int().positive().parse(projectFilter);
      conditions.push(eq(expenses.projectId, projectId));
    }

    if (query) {
      const searchPattern = `%${query.toLowerCase()}%`;
      conditions.push(sql`(
        lower(coalesce(${expenses.description}, '')) like ${searchPattern}
        or lower(coalesce(${projects.name}, '')) like ${searchPattern}
        or lower(coalesce(${clients.name}, '')) like ${searchPattern}
      )`);
    }

    if (from) {
      conditions.push(sql`${expenses.expenseDate} >= ${from}`);
    }
    if (to) {
      conditions.push(sql`${expenses.expenseDate} <= ${to}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(whereClause);

    const [amountResult] = await db
      .select({ totalAmount: sum(expenses.amount) })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(whereClause);

    const expenseRows = await db
      .select({
        expense: expenses,
        project: projects,
        client: clients,
      })
      .from(expenses)
      .leftJoin(projects, eq(expenses.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(expenses.expenseDate), desc(expenses.id))
      .limit(pageSize)
      .offset(offset);

    const total = totalResult.count;
    res.json({
      data: expenseRows.map(({ expense, project, client }) => ({
        ...expense,
        project: project ?? null,
        client: client ?? null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      totalAmount: Number(amountResult.totalAmount ?? 0),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/expenses
router.post('/expenses', requireAuth, async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);
    const projectId = data.projectId ?? null;

    if (projectId !== null) {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const [newExpense] = await db
      .insert(expenses)
      .values({
        projectId,
        expenseDate: data.expenseDate,
        description: data.description,
        amount: data.amount,
        isBillable: projectId === null ? false : data.isBillable,
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

    const [existing] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const hasProjectId = Object.prototype.hasOwnProperty.call(data, 'projectId');
    const nextProjectId = hasProjectId ? data.projectId ?? null : existing.projectId;

    if (hasProjectId && nextProjectId !== existing.projectId && existing.isInvoiced) {
      return res.status(409).json({
        error: 'Cannot change project for invoiced expense',
      });
    }

    if (hasProjectId && nextProjectId !== null) {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, nextProjectId))
        .limit(1);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    const [updated] = await db
      .update(expenses)
      .set({
        ...data,
        projectId: nextProjectId,
        isBillable: nextProjectId === null ? false : data.isBillable ?? existing.isBillable,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(expenses.id, id))
      .returning();

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
