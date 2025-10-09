import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { settings, clients, projects } from '../db/schema.js';

let testDb: BetterSQLite3Database<typeof schema> | null = null;
let testSqlite: Database.Database | null = null;

export function getTestDb() {
  if (!testDb) {
    testSqlite = new Database(':memory:');
    testDb = drizzle(testSqlite, { schema });
    
    migrate(testDb, { migrationsFolder: './drizzle' });
    
    seedTestDb(testDb);
  }
  return testDb;
}

export function closeTestDb() {
  if (testSqlite) {
    testSqlite.close();
    testSqlite = null;
    testDb = null;
  }
}

function seedTestDb(db: BetterSQLite3Database<typeof schema>) {
  db.insert(settings).values({
    id: 1,
    username: 'admin',
    passwordHash: '$2b$10$placeholder',
    businessName: 'Test Business',
    businessAddress: '123 Test St',
    businessPhone: '555-1234',
    businessEmail: 'test@example.com',
    taxRate: 0.15,
    defaultPaymentTermsDays: 20,
    nextInvoiceNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  db.insert(clients).values({
    id: 1,
    name: 'Test Client',
    email: 'client@example.com',
    phone: '555-5678',
    address: '456 Client Ave',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  db.insert(projects).values({
    id: 1,
    name: 'Test Project',
    clientId: 1,
    hourlyRate: 100,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();
}

export async function createAuthenticatedAgent(agent: any) {
  await agent
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin' });
  return agent;
}
