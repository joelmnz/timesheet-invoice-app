import { Router } from 'express';
import { checkMigrationStatus, runMigrationsWithBackup, backupDatabase } from '../services/migrations.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/migrations/status
 * Check if migrations are needed (public endpoint - needed before login)
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await checkMigrationStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/migrations/run
 * Run database migrations (requires authentication)
 */
router.post('/run', requireAuth, async (req, res, next) => {
  try {
    const dbPath = process.env.DATABASE_PATH || './data/app.db';

    const result = await runMigrationsWithBackup(dbPath);

    if (result.success) {
      res.json({
        success: true,
        message: 'Migrations completed successfully',
        backupPath: result.backupPath,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Migration failed',
        error: result.error,
        backupPath: result.backupPath,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/migrations/backup
 * Create a backup of the database (requires authentication)
 */
router.post('/backup', requireAuth, async (req, res, next) => {
  try {
    const dbPath = process.env.DATABASE_PATH || './data/app.db';

    const backupPath = backupDatabase(dbPath);

    res.json({
      success: true,
      message: 'Backup created successfully',
      backupPath,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
