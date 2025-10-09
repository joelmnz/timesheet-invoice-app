import { Group, ActionIcon, Stack, Text, Anchor } from '@mantine/core';
import { IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import type { Project } from '../../types';
import { EntityTable, Column } from './EntityTable';
import { StatusBadge } from './StatusBadge';
import { formatHourlyRate } from './format';
import { ReactNode } from 'react';

interface ProjectListProps {
  projects: Project[];
  variant?: 'table' | 'compact';
  loading?: boolean;
  emptyState?: ReactNode;
  onView?: (id: number) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  getRightAction?: (project: Project) => ReactNode;
}

export function ProjectList({
  projects,
  variant = 'table',
  loading,
  emptyState,
  onView,
  onEdit,
  onDelete,
  getRightAction,
}: ProjectListProps) {
  if (variant === 'compact') {
    if (loading || !projects || projects.length === 0) {
      return (
        <EntityTable
          columns={[]}
          rows={[]}
          loading={loading}
          emptyState={emptyState}
          getRowKey={(p: Project) => p.id}
        />
      );
    }

    return (
      <Stack gap="sm">
        {projects.map((project) => (
          <Group key={project.id} justify="space-between">
            <div>
              <Anchor
                component="button"
                onClick={() => onView?.(project.id)}
                fw={600}
              >
                {project.name}
              </Anchor>
              <Text size="sm" c="dimmed">
                {project.client?.name} • {formatHourlyRate(project.hourlyRate)}
              </Text>
            </div>
            {getRightAction?.(project)}
          </Group>
        ))}
      </Stack>
    );
  }

  const columns: Column<Project>[] = [
    {
      key: 'name',
      title: 'Name',
      render: (project) => (
        <Anchor
          component="button"
          onClick={() => onView?.(project.id)}
          fw={500}
        >
          {project.name}
        </Anchor>
      ),
    },
    {
      key: 'client',
      title: 'Client',
      render: (project) => project.client?.name || '-',
    },
    {
      key: 'hourlyRate',
      title: 'Hourly Rate',
      align: 'right',
      render: (project) => formatHourlyRate(project.hourlyRate),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (project) => <StatusBadge type="project" active={project.active} />,
    },
  ];

  if (onView || onEdit || onDelete) {
    columns.push({
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (project) => (
        <Group justify="flex-end" gap="xs">
          {onView && (
            <ActionIcon
              variant="light"
              color="gray"
              onClick={(e) => {
                e.stopPropagation();
                onView(project.id);
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
          )}
          {onEdit && (
            <ActionIcon
              variant="light"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
            >
              <IconEdit size={16} />
            </ActionIcon>
          )}
          {onDelete && (
            <ActionIcon
              variant="light"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
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
      rows={projects}
      loading={loading}
      emptyState={emptyState}
      getRowKey={(p) => p.id}
    />
  );
}
