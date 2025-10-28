import { Router } from 'express';
import { db } from '../db/index.js';
import { clients, projects } from '../db/schema.js';
import { eq, like, or, count } from 'drizzle-orm';
import { createClientSchema, updateClientSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';

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

export default router;
