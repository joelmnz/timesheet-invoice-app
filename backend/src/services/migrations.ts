import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db, sqlite } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { dirname } from 'path';

interface MigrationStatus {
  needed: boolean;
  reason?: string;
  tablesExist: boolean;
  settingsExist: boolean;
}

/**
 * Check if database migrations are needed
 */
export async function checkMigrationStatus(): Promise<MigrationStatus> {
  try {
    // Try to query a table to see if schema exists
    const tableCheck = sqlite.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('clients', 'projects', 'time_entries', 'invoices', 'settings')
    `).all();
    
    const tablesExist = tableCheck.length >= 5;
    
    if (!tablesExist) {
      return {
        needed: true,
        reason: 'Database tables do not exist',
        tablesExist: false,
        settingsExist: false,
      };
    }

    // Check if settings are initialized
    const settingsCheck = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    const settingsExist = settingsCheck.length > 0;

    if (!settingsExist) {
      return {
        needed: true,
        reason: 'Settings not initialized',
        tablesExist: true,
        settingsExist: false,
      };
    }

    return {
      needed: false,
      tablesExist: true,
      settingsExist: true,
    };
  } catch (error) {
    // If any error occurs, assume migration is needed
    return {
      needed: true,
      reason: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tablesExist: false,
      settingsExist: false,
    };
  }
}

/**
 * Create a backup of the database file
 * Returns the backup file path
 */
export function backupDatabase(dbPath: string): string {
  if (!existsSync(dbPath)) {
    throw new Error('Database file does not exist');
  }

  const backupDir = dirname(dbPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.backup-${timestamp}`;

  try {
    copyFileSync(dbPath, backupPath);
    console.log(`Database backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to backup database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Running migrations...');
    migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');

    // Seed initial settings if not exists
    const existingSettings = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);

    if (existingSettings.length === 0) {
      console.log('Seeding initial settings...');
      await db.insert(settings).values({
        id: 1,
        companyName: 'Example Company',
        companyAddress: '',
        companyEmail: '',
        companyPhone: '',
        invoiceFooterMarkdown: '',
        nextInvoiceNumber: 1,
      });
      console.log('Initial settings created');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Run migrations with automatic backup
 */
export async function runMigrationsWithBackup(dbPath: string): Promise<{ backupPath?: string; success: boolean; error?: string }> {
  let backupPath: string | undefined;

  try {
    // Only backup if database file exists
    if (existsSync(dbPath)) {
      backupPath = backupDatabase(dbPath);
    }

    await runMigrations();

    return { backupPath, success: true };
  } catch (error) {
    return {
      backupPath,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
