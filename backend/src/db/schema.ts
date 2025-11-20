import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Settings table (singleton with id=1)
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().$default(() => 1),
  companyName: text('company_name').notNull().default('Example Company'),
  companyAddress: text('company_address').default(''),
  companyEmail: text('company_email').default(''),
  companyPhone: text('company_phone').default(''),
  invoiceFooterMarkdown: text('invoice_footer_markdown').default(''),
  nextInvoiceNumber: integer('next_invoice_number').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Clients table
export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  email: text('email'),
  invoiceEmail: text('invoice_email'),
  contactPerson: text('contact_person'),
  defaultHourlyRate: real('default_hourly_rate').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Projects table
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  hourlyRate: real('hourly_rate').notNull().default(0),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  clientActiveIdx: index('projects_client_active_idx').on(table.clientId, table.active),
}));

// Time entries table
export const timeEntries = sqliteTable('time_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  startAt: text('start_at').notNull(),
  endAt: text('end_at'),
  totalHours: real('total_hours').notNull().default(0),
  isInvoiced: integer('is_invoiced', { mode: 'boolean' }).notNull().default(false),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectInvoicedIdx: index('time_entries_project_invoiced_idx').on(table.projectId, table.isInvoiced),
  startAtIdx: index('time_entries_start_at_idx').on(table.startAt),
}));

// Expenses table
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  expenseDate: text('expense_date').notNull(),
  description: text('description'),
  amount: real('amount').notNull(),
  isBillable: integer('is_billable', { mode: 'boolean' }).notNull().default(true),
  isInvoiced: integer('is_invoiced', { mode: 'boolean' }).notNull().default(false),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  projectInvoicedIdx: index('expenses_project_invoiced_idx').on(table.projectId, table.isInvoiced),
  expenseDateIdx: index('expenses_expense_date_idx').on(table.expenseDate),
}));

// Invoices table
export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  number: text('number').notNull().unique(),
  clientId: integer('client_id').notNull().references(() => clients.id),
  projectId: integer('project_id').notNull().references(() => projects.id),
  dateInvoiced: text('date_invoiced').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().default('Draft'),
  subtotal: real('subtotal').notNull(),
  total: real('total').notNull(),
  notes: text('notes'),
  dateSent: text('date_sent'),
  datePaid: text('date_paid'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  dateInvoicedIdx: index('invoices_date_invoiced_idx').on(table.dateInvoiced),
  statusDueDateIdx: index('invoices_status_due_date_idx').on(table.status, table.dueDate),
}));

// Invoice line items table
export const invoiceLineItems = sqliteTable('invoice_line_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'time' | 'expense' | 'manual'
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0),
  amount: real('amount').notNull().default(0),
  linkedTimeEntryId: integer('linked_time_entry_id').references(() => timeEntries.id, { onDelete: 'set null' }),
  linkedExpenseId: integer('linked_expense_id').references(() => expenses.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  invoiceIdIdx: index('invoice_line_items_invoice_id_idx').on(table.invoiceId),
}));

// Types for use in the application
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItem = typeof invoiceLineItems.$inferInsert;
