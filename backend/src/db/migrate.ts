import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db, sqlite } from './index.js';
import { settings } from './schema.js';
import { eq } from 'drizzle-orm';

console.log('Running migrations...');
migrate(db, { migrationsFolder: './drizzle' });

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
}

console.log('Migrations complete!');
sqlite.close();
