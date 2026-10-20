import { Card, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { ClientInvoiceSummary as Summary } from '../types';
import { formatCurrency } from './lists/format';

export function ClientInvoiceSummary({ summary }: { summary: Summary | null | undefined }) {
  const metrics = [
    ['Avg Days to Pay', summary?.avgDaysToPay ?? '—'],
    ['Avg Overdue', summary?.avgOverdue ?? '—'],
    ['Total 12m', summary ? formatCurrency(summary.total) : '—'],
    ['Inv Avg', summary ? formatCurrency(summary.invoiceAverage) : '—'],
  ];

  return (
    <Card shadow="sm" padding="lg" mb="xl">
      <Title order={2} mb="xs">Payment History</Title>
      <Text size="sm" c="dimmed" mb="md">
        {summary
          ? `Based on the latest ${summary.invoiceCount} paid invoices (up to 12), ordered by Invoice Date. Total 12m is not a rolling-year total. Negative Avg Overdue means early payment.`
          : 'Payment history is unavailable. Client details and editing are still available.'}
      </Text>
      {summary?.invoiceCount === 0 && <Text size="sm" mb="md">No paid invoices yet.</Text>}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {metrics.map(([label, value]) => (
          <Stack gap={4} key={label}>
            <Text size="sm" c="dimmed">{label}</Text>
            <Text fw={600} size="xl">{value}</Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Card>
  );
}
