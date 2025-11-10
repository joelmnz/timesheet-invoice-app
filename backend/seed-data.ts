import { db } from './src/db/index.js';
import { clients, projects, invoices } from './src/db/schema.js';
import { DateTime } from 'luxon';

async function seedData() {
  // Create a test client
  const [client] = await db.insert(clients).values({
    name: 'Test Client',
    email: 'test@example.com',
    defaultHourlyRate: 100,
  }).returning();

  // Create a test project
  const [project] = await db.insert(projects).values({
    clientId: client.id,
    name: 'Test Project',
    hourlyRate: 100,
  }).returning();

  // Create invoices with various dates
  const tz = 'Pacific/Auckland';
  
  // Invoice from last financial year (before April 1, 2024)
  await db.insert(invoices).values({
    number: 'INV-0001',
    clientId: client.id,
    projectId: project.id,
    dateInvoiced: '2024-02-15',
    dueDate: '2024-03-20',
    status: 'Paid',
    subtotal: 1000,
    total: 1000,
    datePaid: '2024-03-01',
  });

  // Invoice from current financial year (after April 1, 2024)
  await db.insert(invoices).values({
    number: 'INV-0002',
    clientId: client.id,
    projectId: project.id,
    dateInvoiced: '2024-05-10',
    dueDate: '2024-06-20',
    status: 'Paid',
    subtotal: 2000,
    total: 2000,
    datePaid: '2024-06-05',
  });

  // Recent invoice
  await db.insert(invoices).values({
    number: 'INV-0003',
    clientId: client.id,
    projectId: project.id,
    dateInvoiced: '2024-10-01',
    dueDate: '2024-11-20',
    status: 'Sent',
    subtotal: 3000,
    total: 3000,
  });

  // Very recent paid invoice
  await db.insert(invoices).values({
    number: 'INV-0004',
    clientId: client.id,
    projectId: project.id,
    dateInvoiced: '2024-11-05',
    dueDate: '2024-12-20',
    status: 'Paid',
    subtotal: 1500,
    total: 1500,
    datePaid: '2024-11-08',
  });

  console.log('Test data seeded successfully!');
  process.exit(0);
}

seedData();
