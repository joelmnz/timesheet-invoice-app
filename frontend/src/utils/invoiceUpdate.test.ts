import { describe, expect, it } from 'vitest';
import type { Invoice } from '../types';
import { buildInvoiceUpdate, canEditInvoiceDates } from './invoiceUpdate';

const statuses: Invoice['status'][] = ['Draft', 'Sent', 'Paid', 'Cancelled'];

const values = {
  dateInvoiced: new Date(2026, 9, 1),
  dueDate: new Date(2026, 9, 15),
  status: 'Paid' as const,
  dateSent: new Date(2026, 9, 2),
  datePaid: new Date(2026, 9, 19),
  notes: 'Payment date corrected',
};

describe('invoice edit updates', () => {
  it('sends the corrected Date Paid without locked dates on a Paid invoice', () => {
    const update = buildInvoiceUpdate('Paid', values);

    expect(update).toEqual({
      status: 'Paid',
      dateSent: '2026-10-02',
      datePaid: '2026-10-19',
      notes: 'Payment date corrected',
    });
    expect(update).not.toHaveProperty('dateInvoiced');
    expect(update).not.toHaveProperty('dueDate');
  });

  for (const currentStatus of statuses) {
    for (const status of statuses) {
      it(`aligns date controls and payload for ${currentStatus} → ${status}`, () => {
        const update = buildInvoiceUpdate(currentStatus, { ...values, status });
        const editable = currentStatus === 'Draft' || status === 'Draft';

        expect(canEditInvoiceDates(currentStatus, status)).toBe(editable);
        expect(update.status).toBe(status);
        expect(update.datePaid).toBe('2026-10-19');
        expect(update.notes).toBe(values.notes);
        if (editable) {
          expect(update.dateInvoiced).toBe('2026-10-01');
          expect(update.dueDate).toBe('2026-10-15');
        } else {
          expect(update).not.toHaveProperty('dateInvoiced');
          expect(update).not.toHaveProperty('dueDate');
        }
      });
    }
  }

  it('preserves existing omission of empty optional fields from JSON', () => {
    const update = buildInvoiceUpdate('Paid', {
      ...values,
      dateSent: null,
      datePaid: null,
      notes: '',
    });

    expect(JSON.parse(JSON.stringify(update))).toEqual({ status: 'Paid' });
  });
});
