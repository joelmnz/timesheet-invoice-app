import { Router } from 'express';
import { db } from '../db/index.js';
import { timeEntries, projects, clients } from '../db/schema.js';
import { eq, and, lt, gt, ne, desc, count } from 'drizzle-orm';
import { createTimeEntrySchema, updateTimeEntrySchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { roundUpToSixMinutes, getCurrentTimestamp } from '../utils/time.js';

const router = Router();

// GET /api/time-entries (all time entries with optional filters)
router.get('/time-entries', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSizeParam = parseInt(req.query.page_size as string) || 25;
    const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25;
    const offset = (page - 1) * pageSize;
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
    const status = req.query.status as string || 'all';

    // Build where conditions
    const conditions = [];
    if (projectId) {
      conditions.push(eq(timeEntries.projectId, projectId));
    }
    if (status === 'invoiced') {
      conditions.push(eq(timeEntries.isInvoiced, true));
    } else if (status === 'uninvoiced') {
      conditions.push(eq(timeEntries.isInvoiced, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(timeEntries)
      .where(whereClause);

    const total = totalResult.count;

    // Get paginated entries with project and client data
    const entries = await db
      .select({
        id: timeEntries.id,
        projectId: timeEntries.projectId,
        startAt: timeEntries.startAt,
        endAt: timeEntries.endAt,
        totalHours: timeEntries.totalHours,
        isInvoiced: timeEntries.isInvoiced,
        invoiceId: timeEntries.invoiceId,
        note: timeEntries.note,
        createdAt: timeEntries.createdAt,
        updatedAt: timeEntries.updatedAt,
        project: {
          id: projects.id,
          name: projects.name,
          clientId: projects.clientId,
          hourlyRate: projects.hourlyRate,
          notes: projects.notes,
          active: projects.active,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        },
        client: {
          id: clients.id,
          name: clients.name,
          address: clients.address,
          email: clients.email,
          contactPerson: clients.contactPerson,
          defaultHourlyRate: clients.defaultHourlyRate,
          notes: clients.notes,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
        },
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(timeEntries.startAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      data: entries,
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

// GET /api/projects/:projectId/time-entries
router.get('/projects/:projectId/time-entries', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSizeParam = parseInt(req.query.page_size as string) || 25;
    const pageSize = [10, 25, 50, 100].includes(pageSizeParam) ? pageSizeParam : 25;
    const offset = (page - 1) * pageSize;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId));

    const total = totalResult.count;

    // Get paginated entries sorted by startAt DESC
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.startAt))
      .limit(pageSize)
      .offset(offset);

    res.json({
      data: entries,
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

// POST /api/projects/:projectId/time-entries
router.post('/projects/:projectId/time-entries', requireAuth, async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const data = createTimeEntrySchema.parse(req.body);

    // Calculate total hours if endAt is provided
    let totalHours = 0;
    if (data.endAt) {
      totalHours = roundUpToSixMinutes(data.startAt, data.endAt);
    }

    // Check for overlaps if endAt is provided
    if (data.endAt) {
      const overlaps = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.projectId, projectId),
            lt(timeEntries.startAt, data.endAt),
            gt(timeEntries.endAt, data.startAt)
          )
        )
        .limit(1);

      if (overlaps.length > 0) {
        return res.status(409).json({
          error: 'Time entry overlaps with existing entry',
          conflictingEntry: overlaps[0],
        });
      }
    }

    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        projectId,
        startAt: data.startAt,
        endAt: data.endAt || null,
        totalHours,
        note: data.note,
        isInvoiced: false,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .returning();

    res.status(201).json(newEntry);
  } catch (error) {
    next(error);
  }
});

// POST /api/time-entries (create time entry with projectId in body)
router.post('/time-entries', requireAuth, async (req, res, next) => {
  try {
    const data = createTimeEntrySchema.parse(req.body);
    
    if (!data.projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const projectId = data.projectId;

    // Calculate total hours if endAt is provided
    let totalHours = 0;
    if (data.endAt) {
      totalHours = roundUpToSixMinutes(data.startAt, data.endAt);
    }

    // Check for overlaps if endAt is provided
    if (data.endAt) {
      const overlaps = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.projectId, projectId),
            lt(timeEntries.startAt, data.endAt),
            gt(timeEntries.endAt, data.startAt)
          )
        )
        .limit(1);

      if (overlaps.length > 0) {
        return res.status(409).json({
          error: 'Time entry overlaps with existing entry',
          conflictingEntry: overlaps[0],
        });
      }
    }

    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        projectId,
        startAt: data.startAt,
        endAt: data.endAt || null,
        totalHours,
        note: data.note,
        isInvoiced: false,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .returning();

    res.status(201).json(newEntry);
  } catch (error) {
    next(error);
  }
});

// PUT /api/time-entries/:id
router.put('/time-entries/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateTimeEntrySchema.parse(req.body);

    // Get current entry
    const [currentEntry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .limit(1);

    if (!currentEntry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Check if invoiced before allowing project change
    if (data.projectId && data.projectId !== currentEntry.projectId && currentEntry.isInvoiced) {
      return res.status(409).json({
        error: 'Cannot change project for invoiced time entry',
      });
    }

    const projectId = data.projectId || currentEntry.projectId;
    const startAt = data.startAt || currentEntry.startAt;
    const endAt = data.endAt !== undefined ? data.endAt : currentEntry.endAt;

    // Calculate total hours if both times are present
    let totalHours = currentEntry.totalHours;
    if (startAt && endAt) {
      totalHours = roundUpToSixMinutes(startAt, endAt);

      // Check for overlaps
      const overlaps = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.projectId, projectId),
            lt(timeEntries.startAt, endAt),
            gt(timeEntries.endAt, startAt),
            ne(timeEntries.id, id)
          )
        )
        .limit(1);

      if (overlaps.length > 0) {
        return res.status(409).json({
          error: 'Time entry overlaps with existing entry',
          conflictingEntry: overlaps[0],
        });
      }
    }

    const [updated] = await db
      .update(timeEntries)
      .set({
        projectId,
        startAt,
        endAt,
        totalHours,
        note: data.note !== undefined ? data.note : currentEntry.note,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(timeEntries.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/time-entries/:id
router.delete('/time-entries/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // Check if entry is invoiced
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .limit(1);

    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    if (entry.isInvoiced) {
      return res.status(409).json({
        error: 'Cannot delete invoiced time entry',
      });
    }

    await db.delete(timeEntries).where(eq(timeEntries.id, id));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
