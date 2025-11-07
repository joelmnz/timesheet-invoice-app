import { copyFileSync, existsSync, readFileSync } from 'fs';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db, sqlite } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Core tables that must exist for the app to function
const CORE_TABLES = ['clients', 'projects', 'time_entries', 'invoices', 'settings'];

/**
 * Helper function to compute SHA256 hash of a migration file
 */
function computeMigrationHash(migrationPath: string): string {
  const migrationContent = readFileSync(migrationPath, 'utf-8');
  return crypto.createHash('sha256').update(migrationContent).digest('hex');
}

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
    // Note: CORE_TABLES is a controlled constant, safe for interpolation
    const tableCheck = sqlite.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('${CORE_TABLES.join("','")}')
    `).all();
    
    const tablesExist = tableCheck.length >= CORE_TABLES.length;
    
    if (!tablesExist) {
      return {
        needed: true,
        reason: 'Database tables do not exist',
        tablesExist: false,
        settingsExist: false,
      };
    }

    // Check if Drizzle migration tracking table exists
    const migrationTableCheck = sqlite.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='__drizzle_migrations'
    `).all();
    
    if (migrationTableCheck.length === 0) {
      return {
        needed: true,
        reason: 'Migration tracking table does not exist',
        tablesExist: true,
        settingsExist: false,
      };
    }

    // Check if there are pending migrations by comparing journal with applied migrations
    const migrationsFolder = join(__dirname, '../../drizzle');
    const journalPath = join(migrationsFolder, 'meta', '_journal.json');
    
    if (existsSync(journalPath)) {
      try {
        const journalContent = readFileSync(journalPath, 'utf-8');
        const journal = JSON.parse(journalContent);
        
        // Get all migration tags from the journal and compute their hashes
        const availableMigrations = journal.entries || [];
        const availableHashes = new Set<string>();
        
        for (const entry of availableMigrations) {
          const migrationPath = join(migrationsFolder, `${entry.tag}.sql`);
          if (existsSync(migrationPath)) {
            const hash = computeMigrationHash(migrationPath);
            availableHashes.add(hash);
          }
        }
        
        // Get applied migration hashes from the database
        const appliedMigrations = sqlite.query('SELECT hash FROM __drizzle_migrations ORDER BY id').all() as Array<{ hash: string }>;
        const appliedHashes = new Set(appliedMigrations.map(m => m.hash));
        
        // Check if there are any pending migrations (hashes in available but not in applied)
        const pendingHashes = Array.from(availableHashes).filter(hash => !appliedHashes.has(hash));
        
        if (pendingHashes.length > 0) {
          // Find the tag names for better error message
          const pendingTags: string[] = [];
          for (const entry of availableMigrations) {
            const migrationPath = join(migrationsFolder, `${entry.tag}.sql`);
            if (existsSync(migrationPath)) {
              const hash = computeMigrationHash(migrationPath);
              if (pendingHashes.includes(hash)) {
                pendingTags.push(entry.tag);
              }
            }
          }
          
          return {
            needed: true,
            reason: `Pending migrations detected: ${pendingTags.join(', ')}`,
            tablesExist: true,
            settingsExist: true,
          };
        }
      } catch (error) {
        console.warn('Failed to check for pending migrations:', error);
        // Continue to other checks if journal reading fails
      }
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
    
    const migrationsFolder = join(__dirname, '../../drizzle');
    
    // Check if tables exist but __drizzle_migrations doesn't
    // Note: CORE_TABLES is a controlled constant, safe for interpolation
    const tableCheck = sqlite.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('${CORE_TABLES.join("','")}')
    `).all();
    
    const migrationTableCheck = sqlite.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='__drizzle_migrations'
    `).all();
    
    const tablesExist = tableCheck.length >= CORE_TABLES.length;
    const migrationTrackingExists = migrationTableCheck.length > 0;
    
    // If tables exist but migration tracking doesn't, we need to initialize the tracking table
    // and mark migration 0000 as already applied to prevent data loss
    if (tablesExist && !migrationTrackingExists) {
      console.log('Existing database detected without migration tracking. Initializing tracking table...');
      
      // Create the migration tracking table manually
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at INTEGER
        )
      `);
      
      // Mark migration 0000 as already applied
      // This prevents Drizzle from trying to CREATE tables that already exist
      // Read migration 0000 file and compute its SHA256 hash (Drizzle uses hashes, not tags)
      const migration0000Path = join(migrationsFolder, '0000_young_madripoor.sql');
      const migration0000Hash = computeMigrationHash(migration0000Path);
      const timestamp = Date.now();
      
      // Use parameterized query to prevent SQL injection
      const stmt = sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)');
      stmt.run(migration0000Hash, timestamp);
      
      console.log('✓ Migration tracking initialized, marked migration 0000 as applied');
      console.log('  Now applying pending migrations (0001+)...');
    }
    
    // Use Drizzle's migrate function to run pending migrations
    // This will now only run migrations after 0000 for existing databases
    await migrate(db, { migrationsFolder });
    
    console.log('✓ All migrations applied successfully');
    
    // Log which migrations have been applied for debugging
    const appliedMigrations = sqlite.query('SELECT hash FROM __drizzle_migrations ORDER BY id').all() as Array<{ hash: string }>;
    console.log(`  Applied migrations: ${appliedMigrations.map(m => m.hash).join(', ')}`);

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
      console.log('✓ Initial settings created');
    }
    
    console.log('Migrations completed successfully');
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
