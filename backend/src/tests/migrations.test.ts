import { describe, test, expect, beforeAll } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Database } from 'bun:sqlite';

// Test the migration status check logic
describe('Migration Status Check', () => {
  const testDbPath = './data/test/migration-test.db';
  const testDir = dirname(testDbPath);
  
  beforeAll(() => {
    // Clean up any existing test database
    mkdirSync(testDir, { recursive: true });
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  test('should detect pending migrations when new migrations exist', async () => {
    // Create a test database with migration tracking
    const db = new Database(testDbPath);
    
    // Create the migration tracking table
    db.exec(`
      CREATE TABLE __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at INTEGER
      )
    `);
    
    // Create core tables to simulate an existing database
    db.exec(`
      CREATE TABLE clients (id INTEGER PRIMARY KEY);
      CREATE TABLE projects (id INTEGER PRIMARY KEY);
      CREATE TABLE time_entries (id INTEGER PRIMARY KEY);
      CREATE TABLE invoices (id INTEGER PRIMARY KEY);
      CREATE TABLE settings (id INTEGER PRIMARY KEY);
    `);
    
    // Insert only the first migration as applied
    const stmt = db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)');
    stmt.run('0000_young_madripoor', Date.now());
    
    db.close();
    
    // Now import and test the migrations service with this database
    // We need to set the DATABASE_PATH before importing
    const oldDbPath = process.env.DATABASE_PATH;
    process.env.DATABASE_PATH = testDbPath;
    
    // Force re-import by using dynamic import
    const { checkMigrationStatus } = await import('../services/migrations.js');
    
    const status = await checkMigrationStatus();
    
    // Restore original DATABASE_PATH
    process.env.DATABASE_PATH = oldDbPath;
    
    // The status should indicate that migration is needed because 0001 is pending
    expect(status.needed).toBe(true);
    expect(status.reason).toContain('0001_secret_rawhide_kid');
    expect(status.tablesExist).toBe(true);
    
    // Clean up
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });
});

