import { Table, Center, Loader, Text, Group, ActionIcon, Badge, Select } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { Pagination } from '../common/Pagination';
import type { TimeEntry, Project, PaginatedResponse } from '../../types';

export interface TimeEntryListProps {
  timeEntries: TimeEntry[];
  projects?: Project[];
  loading?: boolean;
  emptyState?: string;
  pagination?: PaginatedResponse<TimeEntry>['pagination'];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onEdit?: (entry: TimeEntry) => void;
  onDelete?: (entry: TimeEntry) => void;
  showProjectColumn?: boolean;
  showProjectFilter?: boolean;
  selectedProjectId?: number | null;
  onProjectFilterChange?: (projectId: number | null) => void;
  selectedStatus?: 'all' | 'uninvoiced' | 'invoiced';
  onStatusFilterChange?: (status: 'all' | 'uninvoiced' | 'invoiced') => void;
}

export function TimeEntryList({
  timeEntries,
  projects,
  loading,
  emptyState,
  pagination,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  showProjectColumn = false,
  showProjectFilter = false,
  selectedProjectId,
  onProjectFilterChange,
  selectedStatus = 'all',
  onStatusFilterChange,
}: TimeEntryListProps) {
  const projectOptions = projects?.map((project) => ({
    value: project.id.toString(),
    label: project.name,
  })) || [];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'uninvoiced', label: 'Uninvoiced' },
    { value: 'invoiced', label: 'Invoiced' },
  ];

  if (loading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );
  }

  return (
    <>
      {(showProjectFilter || onStatusFilterChange) && (
        <Group mb="md">
          {showProjectFilter && onProjectFilterChange && (
            <Select
              label="Project"
              placeholder="All Projects"
              data={projectOptions}
              value={selectedProjectId?.toString() || null}
              onChange={(value) => onProjectFilterChange(value ? parseInt(value) : null)}
              clearable
              searchable
              style={{ minWidth: 200 }}
            />
          )}
          {onStatusFilterChange && (
            <Select
              label="Status"
              data={statusOptions}
              value={selectedStatus}
              onChange={(value) => onStatusFilterChange(value as 'all' | 'uninvoiced' | 'invoiced')}
              style={{ minWidth: 150 }}
            />
          )}
        </Group>
      )}

      {!timeEntries || timeEntries.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          {emptyState || 'No time entries yet. Add your first time entry!'}
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Start</Table.Th>
              <Table.Th>End</Table.Th>
              <Table.Th ta="right">Hours</Table.Th>
              {showProjectColumn && <Table.Th>Project</Table.Th>}
              <Table.Th>Note</Table.Th>
              <Table.Th ta="center">Status</Table.Th>
              {(onEdit || onDelete) && <Table.Th ta="right">Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {timeEntries.map((entry) => (
              <Table.Tr key={entry.id}>
                <Table.Td>
                  {DateTime.fromISO(entry.startAt).toFormat('yyyy-MM-dd HH:mm')}
                </Table.Td>
                <Table.Td>
                  {entry.endAt
                    ? DateTime.fromISO(entry.endAt).toFormat('yyyy-MM-dd HH:mm')
                    : 'Running'}
                </Table.Td>
                <Table.Td ta="right">{entry.totalHours.toFixed(2)}</Table.Td>
                {showProjectColumn && (
                  <Table.Td>
                    {entry.project?.name || 'Unknown'}
                    {entry.client && (
                      <Text size="xs" c="dimmed">
                        {entry.client.name}
                      </Text>
                    )}
                  </Table.Td>
                )}
                <Table.Td>{entry.note || '-'}</Table.Td>
                <Table.Td ta="center">
                  <Badge color={entry.isInvoiced ? 'blue' : 'gray'}>
                    {entry.isInvoiced ? 'Invoiced' : 'Uninvoiced'}
                  </Badge>
                </Table.Td>
                {(onEdit || onDelete) && (
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      {onEdit && (
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => onEdit(entry)}
                          disabled={entry.isInvoiced}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      )}
                      {onDelete && (
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => onDelete(entry)}
                          disabled={entry.isInvoiced}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {pagination && onPageChange && onPageSizeChange && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </>
  );
}
