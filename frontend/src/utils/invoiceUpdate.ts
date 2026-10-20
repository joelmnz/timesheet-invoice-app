import { DateTime } from 'luxon';
import type { Invoice } from '../types';

interface InvoiceEditValues {
  dateInvoiced: Date;
  dueDate: Date;
  status: Invoice['status'];
  dateSent: Date | null;
  datePaid: Date | null;
  notes: string;
}

export function canEditInvoiceDates(currentStatus: Invoice['status'], nextStatus: Invoice['status']) {
  return currentStatus === 'Draft' || nextStatus === 'Draft';
}

export function buildInvoiceUpdate(currentStatus: Invoice['status'], values: InvoiceEditValues): Partial<Invoice> {
  const data: Partial<Invoice> = {
    status: values.status,
    dateSent: values.dateSent ? DateTime.fromJSDate(values.dateSent).toISODate() || undefined : undefined,
    datePaid: values.datePaid ? DateTime.fromJSDate(values.datePaid).toISODate() || undefined : undefined,
    notes: values.notes || undefined,
  };

  if (canEditInvoiceDates(currentStatus, values.status)) {
    data.dateInvoiced = DateTime.fromJSDate(values.dateInvoiced).toISODate() || '';
    data.dueDate = DateTime.fromJSDate(values.dueDate).toISODate() || '';
  }

  return data;
}
