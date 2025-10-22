import { Group, Pagination as MantinePagination, Select } from '@mantine/core';
import type { PaginationMeta } from '../../types';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per page' },
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
];

export function Pagination({ pagination, onPageChange, onPageSizeChange }: PaginationProps) {
  if (pagination.total === 0) {
    return null;
  }

  return (
    <Group justify="space-between" mt="md">
      <Select
        data={PAGE_SIZE_OPTIONS}
        value={pagination.pageSize.toString()}
        onChange={(value) => {
          if (value) {
            onPageSizeChange(parseInt(value));
          }
        }}
        w={150}
      />
      <MantinePagination
        total={pagination.totalPages}
        value={pagination.page}
        onChange={onPageChange}
        siblings={1}
        boundaries={1}
      />
    </Group>
  );
}
