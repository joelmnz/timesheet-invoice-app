import { Table, Center, Loader, Text } from '@mantine/core';
import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render: (row: T) => ReactNode;
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyState?: ReactNode;
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
}

export function EntityTable<T>({
  columns,
  rows,
  loading,
  emptyState,
  getRowKey,
  onRowClick,
  footer,
}: EntityTableProps<T>) {
  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Text c="dimmed" ta="center" mt="xl">
        {emptyState || 'No data available'}
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          {columns.map((col) => (
            <Table.Th key={col.key} ta={col.align} style={{ width: col.width }}>
              {col.title}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((col) => (
              <Table.Td key={col.key} ta={col.align}>
                {col.render(row)}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
      {footer && <Table.Tfoot>{footer}</Table.Tfoot>}
    </Table>
  );
}
