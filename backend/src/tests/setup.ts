import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from '../db/index.js';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key-for-testing';
process.env.TZ = 'Pacific/Auckland';
process.env.DATABASE_PATH = ':memory:';
process.env.APP_USERNAME = 'admin';
process.env.APP_PASSWORD = 'admin';

// Run migrations for in-memory test database
console.log('Running test database migrations...');
migrate(db, { migrationsFolder: './drizzle' });
console.log('Test database migrations complete!');
