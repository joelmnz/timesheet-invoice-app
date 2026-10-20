import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MantineProvider } from '@mantine/core';
import { ClientInvoiceSummary } from './ClientInvoiceSummary';
import type { ClientInvoiceSummary as Summary } from '../types';

function render(summary: Summary | null) {
  return renderToStaticMarkup(<MantineProvider><ClientInvoiceSummary summary={summary} /></MantineProvider>);
}

describe('Client invoice summary', () => {
  it('renders server values including early payments and currency precision', () => {
    const html = render({ invoiceCount: 2, avgDaysToPay: 35.5, avgOverdue: -4, total: 1234.56, invoiceAverage: 617.28 });
    for (const text of ['Avg Days to Pay', 'Avg Overdue', 'Total 12m', 'Inv Avg', '35.5', '-4', '$1234.56', '$617.28', 'latest 2 paid invoices', 'not a rolling-year total']) {
      expect(html).toContain(text);
    }
  });

  it('distinguishes unavailable day averages from valid zero money totals', () => {
    const html = render({ invoiceCount: 0, avgDaysToPay: null, avgOverdue: null, total: 0, invoiceAverage: 0 });
    expect(html).toContain('No paid invoices yet.');
    expect(html).toContain('—');
    expect(html).toContain('$0.00');
  });

  it('renders unavailable summaries without pretending there are zero invoices', () => {
    const html = render(null);
    expect(html).toContain('Client details and editing are still available.');
    expect(html).not.toContain('$0.00');
    expect(html).not.toContain('No paid invoices yet.');
  });
});
