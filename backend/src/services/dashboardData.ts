import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clients, expenses, invoices, projects, timeEntries } from '../db/schema.js';
import { calculateDaysOverdue } from '../utils/time.js';

export async function getUninvoicedHoursByProject() {
  return db
    .select({
      projectId: timeEntries.projectId,
      projectName: projects.name,
      clientId: clients.id,
      clientName: clients.name,
      totalHours: sql<number>`SUM(${timeEntries.totalHours})`,
      hourlyRate: projects.hourlyRate,
      totalAmount: sql<number>`SUM(${timeEntries.totalHours}) * ${projects.hourlyRate}`,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(timeEntries.isInvoiced, false),
        sql`${timeEntries.endAt} IS NOT NULL`
      )
    )
    .groupBy(timeEntries.projectId, projects.name, clients.id, clients.name, projects.hourlyRate);
}

export async function getUninvoicedExpensesByProject() {
  return db
    .select({
      projectId: expenses.projectId,
      projectName: projects.name,
      clientId: clients.id,
      clientName: clients.name,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .innerJoin(projects, eq(expenses.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(expenses.isInvoiced, false),
        eq(expenses.isBillable, true)
      )
    )
    .groupBy(expenses.projectId, projects.name, clients.id, clients.name);
}

export async function getOutstandingInvoices() {
  const outstandingInvoicesRaw = await db
    .select({
      invoice: invoices,
      clientName: clients.name,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.status, 'Sent'))
    .orderBy(invoices.dueDate);

  return outstandingInvoicesRaw.map(({ invoice, clientName }) => ({
    id: invoice.id,
    number: invoice.number,
    dateInvoiced: invoice.dateInvoiced,
    dueDate: invoice.dueDate,
    clientName,
    total: invoice.total,
    daysOverdue: calculateDaysOverdue(invoice.dueDate),
  }));
}

export async function getDashboardSummaryData() {
  const [uninvoicedHoursByProject, uninvoicedExpensesByProject, outstandingInvoices] = await Promise.all([
    getUninvoicedHoursByProject(),
    getUninvoicedExpensesByProject(),
    getOutstandingInvoices(),
  ]);

  return {
    uninvoicedHoursByProject,
    uninvoicedExpensesByProject,
    outstandingInvoices,
  };
}
