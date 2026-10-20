import { describe, expect, it } from 'vitest';
import type { Invoice } from '../types';
import { buildInvoiceUpdate } from './invoiceUpdate';

const statuses: Invoice['status'][] = ['Draft', 'Sent', 'Paid', 'Cancelled'];

const values = {
  dateInvoiced: '2026-10-01',
  dueDate: '2026-10-15',
  status: 'Paid' as const,
  dateSent: '2026-10-02',
  datePaid: '2026-10-19',
  notes: 'Dates corrected',
};

describe('invoice edit updates', () => {
  for (const status of statuses) {
    it(`sends every correction without changing ${status} status`, () => {
      const update = buildInvoiceUpdate({ ...values, status });

      expect(update).toEqual({ ...values, status });
      expect(JSON.parse(JSON.stringify(update))).toEqual({ ...values, status });
    });

    it(`preserves explicit clears in JSON for ${status}`, () => {
      const cleared = { ...values, status, dateSent: null, datePaid: null, notes: '' };

      expect(JSON.parse(JSON.stringify(buildInvoiceUpdate(cleared)))).toEqual(cleared);
    });
  }

  it('preserves Mantine date-only values without timezone conversion', () => {
    const dates = {
      dateInvoiced: '2026-01-01',
      dueDate: '2026-02-01',
      dateSent: '2026-01-02',
      datePaid: '2026-01-31',
    };

    expect(buildInvoiceUpdate({ ...values, ...dates })).toEqual({ ...values, ...dates });
  });
});
