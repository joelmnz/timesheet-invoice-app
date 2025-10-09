import { Router } from 'express';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { updateSettingsSchema } from '../types/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [settingsData] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1);

    if (!settingsData) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    // Add timezone from env
    const response = {
      ...settingsData,
      timezone: process.env.TZ || 'Pacific/Auckland',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings
router.put('/', requireAuth, async (req, res, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);

    const [updated] = await db
      .update(settings)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(settings.id, 1))
      .returning();

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
