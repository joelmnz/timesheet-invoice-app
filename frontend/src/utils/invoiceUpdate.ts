import type { Invoice } from '../types';

interface InvoiceEditValues {
  dateInvoiced: string;
  dueDate: string;
  status: Invoice['status'];
  dateSent: string | null;
  datePaid: string | null;
  notes: string;
}

export function buildInvoiceUpdate(values: InvoiceEditValues): Partial<Invoice> {
  return {
    dateInvoiced: values.dateInvoiced,
    dueDate: values.dueDate,
    status: values.status,
    dateSent: values.dateSent,
    datePaid: values.datePaid,
    notes: values.notes,
  };
}
