import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/app.db';

// Ensure the directory exists
await mkdir(dirname(dbPath), { recursive: true });

export const sqlite: Database.Database = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
