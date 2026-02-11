import { db, sqlite } from './src/db/index.js';
import { clients, projects, invoices, settings, type NewInvoice } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function seedData() {
  try {
    // Check if tables exist
    const clientTableExists = sqlite.query("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'").get();
    if (!clientTableExists) {
      console.error('❌ Error: Database tables not found. Please run migrations first:');
      console.error('bun run db:migrate');
      process.exit(1);
    }

    console.log('🌱 Seeding data...');

    // 1. Get or Create Test Client
    let client = await db.query.clients.findFirst({
      where: eq(clients.email, 'test@example.com'),
    });

    if (!client) {
      console.log('Creating Test Client...');
      const results = await db.insert(clients).values({
        name: 'Test Client',
        email: 'test@example.com',
        defaultHourlyRate: 100,
      }).returning();
      client = results[0];
    } else {
      console.log('Test Client already exists.');
    }

    // 2. Get or Create Test Project
    let project = await db.query.projects.findFirst({
      where: eq(projects.clientId, client.id),
    });

    if (!project) {
      console.log('Creating Test Project...');
      const results = await db.insert(projects).values({
        clientId: client.id,
        name: 'Test Project',
        hourlyRate: 100,
      }).returning();
      project = results[0];
    } else {
      console.log('Test Project already exists.');
    }

    // 3. Create Invoices (Upsert based on number)
    const invoicesData: NewInvoice[] = [
      {
        number: 'INV-0001',
        clientId: client.id,
        projectId: project.id,
        dateInvoiced: '2024-02-15',
        dueDate: '2024-03-20',
        status: 'Paid',
        subtotal: 1000,
        total: 1000,
        datePaid: '2024-03-01',
      },
      {
        number: 'INV-0002',
        clientId: client.id,
        projectId: project.id,
        dateInvoiced: '2024-05-10',
        dueDate: '2024-06-20',
        status: 'Paid',
        subtotal: 2000,
        total: 2000,
        datePaid: '2024-06-05',
      },
      {
        number: 'INV-0003',
        clientId: client.id,
        projectId: project.id,
        dateInvoiced: '2024-10-01',
        dueDate: '2024-11-20',
        status: 'Sent',
        subtotal: 3000,
        total: 3000,
      },
      {
        number: 'INV-0004',
        clientId: client.id,
        projectId: project.id,
        dateInvoiced: '2024-11-05',
        dueDate: '2024-12-20',
        status: 'Paid',
        subtotal: 1500,
        total: 1500,
        datePaid: '2024-11-08',
      },
    ];

    for (const inv of invoicesData) {
      const existing = await db.query.invoices.findFirst({
        where: eq(invoices.number, inv.number),
      });

      if (!existing) {
        console.log(`Creating invoice ${inv.number}...`);
        await db.insert(invoices).values(inv);
      } else {
        console.log(`Invoice ${inv.number} already exists.`);
      }
    }

    // 4. Update Next Invoice Number in Settings
    // Find the highest invoice number (assuming format INV-XXXX)
    let maxInvoiceNum = 0;

    // Check all existing invoices to find the max number
    const allInvoices = await db.query.invoices.findMany();
    for (const inv of allInvoices) {
      if (inv.number.startsWith('INV-')) {
        const numPart = parseInt(inv.number.replace('INV-', ''), 10);
        if (!isNaN(numPart) && numPart > maxInvoiceNum) {
          maxInvoiceNum = numPart;
        }
      }
    }

    // Set next invoice number to max + 1
    const nextInvoiceNum = maxInvoiceNum + 1;
    console.log(`Updating settings: Next Invoice Number set to ${nextInvoiceNum}`);

    await db.update(settings)
      .set({ nextInvoiceNumber: nextInvoiceNum })
      .where(eq(settings.id, 1));

    console.log('✅ Test data seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error Seeding Data:', error);
    process.exit(1);
  }
}

seedData();
