import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema.js';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/app.db';

// Ensure the directory exists
await mkdir(dirname(dbPath), { recursive: true });

export const sqlite = new Database(dbPath);
sqlite.exec('PRAGMA journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
