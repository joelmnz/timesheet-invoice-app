import { Group, ActionIcon, Text, Anchor } from '@mantine/core';
import { IconEye, IconDownload } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import type { Invoice } from '../../types';
import { EntityTable, Column } from './EntityTable';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from './format';
import { ReactNode } from 'react';

interface InvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  emptyState?: ReactNode;
  showDueStatus?: boolean;
  onView?: (id: number) => void;
  onDownload?: (id: number, number: string, clientName: string) => void;
  compact?: boolean;
}

export function InvoiceList({
  invoices,
  loading,
  emptyState,
  showDueStatus = true,
  onView,
  onDownload,
  compact = false,
}: InvoiceListProps) {
  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      title: 'Invoice #',
      render: (invoice) =>
        onView ? (
          <Anchor component="button" onClick={() => onView(invoice.id)} fw={600}>
            {invoice.number}
          </Anchor>
        ) : (
          invoice.number
        ),
    },
  ];

  if (!compact) {
    columns.push({
      key: 'client',
      title: 'Client',
      render: (invoice) => invoice.client?.name || '-',
    });
    columns.push({
      key: 'project',
      title: 'Project',
      render: (invoice) => invoice.project?.name || '-',
    });
  }

  columns.push({
    key: 'dateInvoiced',
    title: 'Date',
    render: (invoice) => invoice.dateInvoiced,
  });

  columns.push({
    key: 'dueDate',
    title: 'Due Date',
    render: (invoice) => {
      const dueDate = DateTime.fromISO(invoice.dueDate);
      const today = DateTime.now();
      const isOverdue = showDueStatus && invoice.status === 'Unpaid' && dueDate < today;

      return (
        <>
          {invoice.dueDate}
          {isOverdue && (
            <Text size="xs" c="red" span>
              {' '}
              (Overdue)
            </Text>
          )}
        </>
      );
    },
  });

  columns.push({
    key: 'total',
    title: 'Total',
    align: 'right',
    render: (invoice) => formatCurrency(invoice.total),
  });

  columns.push({
    key: 'status',
    title: 'Status',
    align: 'center',
    render: (invoice) => <StatusBadge type="invoice" status={invoice.status} />,
  });

  if (onView || onDownload) {
    columns.push({
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (invoice) => (
        <Group justify="flex-end" gap="xs">
          {onView && (
            <ActionIcon
              variant="light"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onView(invoice.id);
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
          )}
          {onDownload && (
            <ActionIcon
              variant="light"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(invoice.id, invoice.number, invoice.client?.name || 'Unknown');
              }}
            >
              <IconDownload size={16} />
            </ActionIcon>
          )}
        </Group>
      ),
    });
  }

  return (
    <EntityTable
      columns={columns}
      rows={invoices}
      loading={loading}
      emptyState={emptyState}
      getRowKey={(i) => i.id}
    />
  );
}
