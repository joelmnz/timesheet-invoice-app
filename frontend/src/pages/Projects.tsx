import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  NumberInput,
  Textarea,
  Select,
  TextInput,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { clientsApi, projectsApi } from '../services/api';
import type { Project } from '../types';
import { ListHeader } from '../components/lists/ListHeader';
import { ProjectList } from '../components/lists/ProjectList';

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('true');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: projectsResponse, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeFilter, page, pageSize],
    queryFn: () => projectsApi.list(activeFilter, page, pageSize),
  });

  const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const clients = clientsResponse?.data || [];

  const projects = projectsResponse?.data || [];

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

  const clientOptions = clients?.map((client) => ({
    value: client.id.toString(),
    label: `${client.name} (NZD ${client.defaultHourlyRate}/hr)`,
  })) || [];

  return (
    <Container size="xl">
      <ListHeader
        title="Projects"
        action={
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal} data-testid="create-project-btn">
            New Project
          </Button>
        }
      >
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
      </ListHeader>

      <ProjectList
        projects={projects || []}
        loading={projectsLoading || clientsLoading}
        emptyState="No projects found. Create your first project!"
        pagination={projectsResponse?.pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onView={handleViewProject}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

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
              data-testid="project-name-input"
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
              data-testid="project-client-select"
            />
            <NumberInput
              label="Hourly Rate (NZD)"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...form.getInputProps('hourlyRate')}
              data-testid="project-rate-input"
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...form.getInputProps('notes')}
              data-testid="project-notes-input"
            />
            <Switch
              label="Active"
              {...form.getInputProps('active', { type: 'checkbox' })}
              data-testid="project-active-switch"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                data-testid="project-submit-btn"
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
