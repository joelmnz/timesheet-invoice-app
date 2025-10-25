import { Router } from 'express';
import { db } from '../db/index.js';
import { timeEntries } from '../db/schema.js';
import { eq, and, lt, gt, ne, desc, count } from 'drizzle-orm';
import { createTimeEntrySchema, updateTimeEntrySchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { roundUpToSixMinutes, getCurrentTimestamp } from '../utils/time.js';

const router = Router();

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
            eq(timeEntries.projectId, currentEntry.projectId),
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
