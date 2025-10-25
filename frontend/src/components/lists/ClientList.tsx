import { Group, ActionIcon, Anchor } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type { Client } from '../../types';
import { EntityTable, Column } from './EntityTable';
import { formatHourlyRate } from './format';
import { ReactNode } from 'react';

interface ClientListProps {
  clients: Client[];
  loading?: boolean;
  emptyState?: ReactNode;
  onClick?: (id: number) => void;
  onEdit?: (client: Client) => void;
  onDelete?: (client: Client) => void;
}

export function ClientList({
  clients,
  loading,
  emptyState,
  onClick,
  onEdit,
  onDelete,
}: ClientListProps) {
  const columns: Column<Client>[] = [
    {
      key: 'name',
      title: 'Name',
      render: (client) =>
        onClick ? (
          <Anchor component="button" onClick={() => onClick(client.id)}>
            {client.name}
          </Anchor>
        ) : (
          client.name
        ),
    },
    {
      key: 'contactPerson',
      title: 'Contact Person',
      render: (client) => client.contactPerson || '-',
    },
    {
      key: 'email',
      title: 'Email',
      render: (client) => client.email || '-',
    },
    {
      key: 'defaultRate',
      title: 'Default Rate',
      align: 'right',
      render: (client) => formatHourlyRate(client.defaultHourlyRate),
    },
  ];

  if (onEdit || onDelete) {
    columns.push({
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (client) => (
        <Group justify="flex-end" gap="xs">
          {onEdit && (
            <ActionIcon
              variant="light"
              color="blue"
              aria-label="Edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(client);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
          )}
          {onDelete && (
            <ActionIcon
              variant="light"
              color="red"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(client);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      ),
    });
  }

  return (
    <EntityTable
      columns={columns}
      rows={clients}
      loading={loading}
      emptyState={emptyState}
      getRowKey={(c) => c.id}
    />
  );
}
