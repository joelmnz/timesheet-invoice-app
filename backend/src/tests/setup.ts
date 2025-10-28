import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';

// Set test environment variables BEFORE importing the database
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key-for-testing';
process.env.TZ = 'Pacific/Auckland';
// Use an isolated on-disk DB for tests so nothing touches the dev DB
const TEST_DB_PATH = './data/test/app.test.db';
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.APP_USERNAME = 'admin';
process.env.APP_PASSWORD = 'admin';

// Ensure clean state for each test run
const testDir = dirname(TEST_DB_PATH);
mkdirSync(testDir, { recursive: true });
if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH);
const testSessionDb = join(testDir, 'sessions.db');
if (existsSync(testSessionDb)) rmSync(testSessionDb);

// Dynamically import the DB after env vars are set
const { db } = await import('../db/index.js');
const { settings } = await import('../db/schema.js');
const { eq } = await import('drizzle-orm');

// Run migrations for the test database
console.log('Running test database migrations...');
await migrate(db, { migrationsFolder: './drizzle' });
console.log('Test database migrations complete!');

// Ensure settings row exists for invoice number sequencing etc.
const existing = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
if (existing.length === 0) {
	await db.insert(settings).values({
		id: 1,
		companyName: 'Test Business',
		companyAddress: '',
		companyEmail: '',
		companyPhone: '',
		invoiceFooterMarkdown: '',
		nextInvoiceNumber: 1,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});
}
