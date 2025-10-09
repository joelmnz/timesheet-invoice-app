import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  Modal,
  Stack,
  Loader,
  Center,
  Text,
  ActionIcon,
  NumberInput,
  Textarea,
  Select,
  Badge,
  TextInput,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import { clientsApi, projectsApi } from '../services/api';
import type { Project } from '../types';

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('true');

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeFilter],
    queryFn: () => projectsApi.list(activeFilter),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const form = useForm({
    initialValues: {
      name: '',
      clientId: '',
      hourlyRate: 0,
      notes: '',
      active: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      clientId: (value) => (!value ? 'Client is required' : null),
      hourlyRate: (value) => (value <= 0 ? 'Hourly rate must be greater than 0' : null),
    },
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      notifications.show({
        title: 'Success',
        message: 'Project created successfully',
        color: 'green',
      });
      closeModal();
      form.reset();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      notifications.show({
        title: 'Success',
        message: 'Project updated successfully',
        color: 'green',
      });
      closeModal();
      form.reset();
      setEditingProject(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      notifications.show({
        title: 'Success',
        message: 'Project deleted successfully',
        color: 'green',
      });
      closeDeleteModal();
      setDeletingProject(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    form.reset();
    openModal();
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    form.setValues({
      name: project.name,
      clientId: project.clientId.toString(),
      hourlyRate: project.hourlyRate,
      notes: project.notes || '',
      active: project.active,
    });
    openModal();
  };

  const handleOpenDeleteModal = (project: Project) => {
    setDeletingProject(project);
    openDeleteModal();
  };

  const handleSubmit = form.onSubmit((values) => {
    const data = {
      ...values,
      clientId: parseInt(values.clientId),
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  });

  const handleDelete = () => {
    if (deletingProject) {
      deleteMutation.mutate(deletingProject.id);
    }
  };

  const handleViewProject = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  if (projectsLoading || clientsLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  const clientOptions = clients?.map((client) => ({
    value: client.id.toString(),
    label: `${client.name} (NZD ${client.defaultHourlyRate}/hr)`,
  })) || [];

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Projects</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          New Project
        </Button>
      </Group>

      <Group mb="md">
        <Button
          variant={activeFilter === 'all' ? 'filled' : 'light'}
          onClick={() => setActiveFilter('all')}
        >
          All
        </Button>
        <Button
          variant={activeFilter === 'true' ? 'filled' : 'light'}
          onClick={() => setActiveFilter('true')}
        >
          Active
        </Button>
        <Button
          variant={activeFilter === 'false' ? 'filled' : 'light'}
          onClick={() => setActiveFilter('false')}
        >
          Inactive
        </Button>
      </Group>

      {!projects || projects.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          No projects found. Create your first project!
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th ta="right">Hourly Rate</Table.Th>
              <Table.Th ta="center">Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {projects.map((project) => (
              <Table.Tr key={project.id}>
                <Table.Td>{project.name}</Table.Td>
                <Table.Td>{project.client?.name || '-'}</Table.Td>
                <Table.Td ta="right">NZD {project.hourlyRate.toFixed(2)}/hr</Table.Td>
                <Table.Td ta="center">
                  <Badge color={project.active ? 'green' : 'gray'}>
                    {project.active ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs">
                    <ActionIcon
                      variant="light"
                      color="gray"
                      onClick={() => handleViewProject(project.id)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => handleOpenEditModal(project)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleOpenDeleteModal(project)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingProject ? 'Edit Project' : 'Create Project'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Project name"
              required
              {...form.getInputProps('name')}
            />
            <Select
              label="Client"
              placeholder="Select a client"
              data={clientOptions}
              required
              searchable
              {...form.getInputProps('clientId')}
              onChange={(value) => {
                form.setFieldValue('clientId', value || '');
                if (value && !editingProject) {
                  const selectedClient = clients?.find(c => c.id.toString() === value);
                  if (selectedClient) {
                    form.setFieldValue('hourlyRate', selectedClient.defaultHourlyRate);
                  }
                }
              }}
            />
            <NumberInput
              label="Hourly Rate (NZD)"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...form.getInputProps('hourlyRate')}
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...form.getInputProps('notes')}
            />
            <Switch
              label="Active"
              {...form.getInputProps('active', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingProject ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Project"
      >
        <Text mb="md">
          Are you sure you want to delete <strong>{deletingProject?.name}</strong>?
          This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleteMutation.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
