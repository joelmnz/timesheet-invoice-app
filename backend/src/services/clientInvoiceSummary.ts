import { and, desc, eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { db } from '../db/index.js';
import { invoices } from '../db/schema.js';
import { roundToCents } from '../utils/time.js';

type SummaryInvoice = Pick<typeof invoices.$inferSelect, 'total' | 'dateInvoiced' | 'dueDate' | 'datePaid'>;

export interface ClientInvoiceSummary {
  invoiceCount: number;
  avgDaysToPay: number | null;
  avgOverdue: number | null;
  total: number;
  invoiceAverage: number;
}

function calendarDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startDate = DateTime.fromISO(start, { zone: 'utc', setZone: true }).startOf('day');
  const endDate = DateTime.fromISO(end, { zone: 'utc', setZone: true }).startOf('day');
  if (!startDate.isValid || !endDate.isValid) return null;
  // Keep the stored calendar dates, ignoring timestamp offsets and daylight saving.
  return DateTime.fromISO(endDate.toISODate()!, { zone: 'utc' })
    .diff(DateTime.fromISO(startDate.toISODate()!, { zone: 'utc' }), 'days').days;
}

export function calculateClientInvoiceSummary(sample: SummaryInvoice[]): ClientInvoiceSummary {
  let total = 0;
  const daysToPay: number[] = [];
  const overdue: number[] = [];
  for (const invoice of sample) {
    total += invoice.total;
    const paymentDays = calendarDays(invoice.dateInvoiced, invoice.datePaid);
    const overdueDays = calendarDays(invoice.dueDate, invoice.datePaid);
    if (paymentDays !== null) daysToPay.push(paymentDays);
    if (overdueDays !== null) overdue.push(overdueDays);
  }
  const averageDays = (values: number[]) => values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10
    : null;
  const summary = {
    invoiceCount: sample.length,
    avgDaysToPay: averageDays(daysToPay),
    avgOverdue: averageDays(overdue),
    total: roundToCents(total),
    invoiceAverage: sample.length ? roundToCents(total / sample.length) : 0,
  };
  if (Object.values(summary).some(value => value !== null && !Number.isFinite(value))) {
    throw new Error('Non-finite client invoice summary');
  }
  return summary;
}

export async function getClientInvoiceSummary(clientId: number): Promise<ClientInvoiceSummary> {
  const sample = await db.select({
    total: invoices.total,
    dateInvoiced: invoices.dateInvoiced,
    dueDate: invoices.dueDate,
    datePaid: invoices.datePaid,
  }).from(invoices)
    .where(and(eq(invoices.clientId, clientId), eq(invoices.status, 'Paid')))
    .orderBy(desc(invoices.dateInvoiced), desc(invoices.id))
    .limit(12);
  return calculateClientInvoiceSummary(sample);
}
