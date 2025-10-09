import { Database } from 'bun:sqlite';
import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import * as schema from '../db/schema.js';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { eq } from 'drizzle-orm';
import { settings, clients, projects } from '../db/schema.js';

let testDb: BunSQLiteDatabase<typeof schema> | null = null;
let testSqlite: Database | null = null;

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

function seedTestDb(db: BunSQLiteDatabase<typeof schema>) {
  db.insert(settings).values({
    id: 1,
    companyName: 'Test Business',
    companyAddress: '123 Test St',
    companyEmail: 'test@example.com',
    companyPhone: '555-1234',
    invoiceFooterMarkdown: '',
    nextInvoiceNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  db.insert(clients).values({
    name: 'Test Client',
    email: 'client@example.com',
    address: '456 Client Ave',
    contactPerson: 'John Doe',
    defaultHourlyRate: 50,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).run();

  db.insert(projects).values({
    name: 'Test Project',
    clientId: 1,
    hourlyRate: 100,
    active: true,
    notes: '',
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