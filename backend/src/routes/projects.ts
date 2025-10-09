import { Router } from 'express';
import { db } from '../db/index.js';
import { projects, clients, timeEntries, expenses } from '../db/schema.js';
import { eq, and, isNull, count, or, lt, gt } from 'drizzle-orm';
import { createProjectSchema, updateProjectSchema, stopTimerSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { roundUpToSixMinutes, getCurrentTimestamp } from '../utils/time.js';

const router = Router();

// GET /api/projects
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { active = 'all' } = req.query;

    let query = db
      .select({
        project: projects,
        client: clients,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id));

    if (active === 'true') {
      query = query.where(eq(projects.active, true)) as any;
    } else if (active === 'false') {
      query = query.where(eq(projects.active, false)) as any;
    }

    const results = await query;

    const response = results.map(({ project, client }) => ({
      ...project,
      client,
    }));

    res.json(response);
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

export default router;
