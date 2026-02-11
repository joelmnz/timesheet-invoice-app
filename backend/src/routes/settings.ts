import { Router } from 'express';
import { desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { apiKeys, settings } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { createApiKey } from '../middleware/apiKeyAuth.js';
import { updateSettingsSchema } from '../types/validation.js';

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

    const response = {
      ...settingsData,
      timezone: process.env.TZ || 'Pacific/Auckland',
    };

    return res.json(response);
  } catch (error) {
    return next(error);
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

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

// GET /api/settings/api-keys
router.get('/api-keys', requireAuth, async (_req, res, next) => {
  try {
    const records = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        keyLastFour: apiKeys.keyLastFour,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));

    return res.json({
      keys: records,
      hasActiveKey: records.some((key) => !key.revokedAt),
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/settings/api-keys/generate
router.post('/api-keys/generate', requireAuth, async (req, res, next) => {
  try {
    const generated = createApiKey();

    await db.transaction(async (tx) => {
      await tx
        .update(apiKeys)
        .set({ revokedAt: new Date().toISOString() })
        .where(isNull(apiKeys.revokedAt));

      await tx.insert(apiKeys).values({
        name: 'Default API Key',
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        keyLastFour: generated.keyLastFour,
        createdAt: new Date().toISOString(),
      });
    });

    return res.status(201).json({
      apiKey: generated.raw,
      keyPrefix: generated.keyPrefix,
      keyLastFour: generated.keyLastFour,
      createdAt: new Date().toISOString(),
      warning: 'Store this key securely. You will not be able to view it again.',
    });
  } catch (error) {
    return next(error);
  }
});



// DELETE /api/settings/api-keys/:id
router.delete('/api-keys/:id', requireAuth, async (req, res, next) => {
  try {
    const keyIdParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const keyId = Number.parseInt(keyIdParam, 10);

    if (!Number.isInteger(keyId) || keyId <= 0) {
      return res.status(400).json({ error: 'Invalid API key id' });
    }

    const [existing] = await db
      .select({ id: apiKeys.id, revokedAt: apiKeys.revokedAt })
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (existing.revokedAt) {
      return res.status(400).json({ error: 'API key already revoked' });
    }

    await db
      .update(apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, keyId));

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
