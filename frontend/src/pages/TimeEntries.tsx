import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
  Select,
  Text,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { timeEntriesApi, projectsApi } from '../services/api';
import type { TimeEntry } from '../types';
import { TimeEntryList } from '../components/lists/TimeEntryList';

export default function TimeEntries() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'uninvoiced' | 'invoiced'>('uninvoiced');
  const [timeModalOpened, { open: openTimeModal, close: closeTimeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [deletingTimeEntry, setDeletingTimeEntry] = useState<TimeEntry | null>(null);

  const { data: timeEntriesResponse, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['time-entries-all', selectedProjectId, selectedStatus, page, pageSize],
    queryFn: () => timeEntriesApi.listAll({
      projectId: selectedProjectId || undefined,
      status: selectedStatus,
      page,
      pageSize,
    }),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list('all'),
  });

  const timeEntries = timeEntriesResponse?.data || [];

  const timeForm = useForm({
    initialValues: {
      projectId: '',
      startAt: new Date(),
      endAt: new Date(),
      note: '',
    },
    validate: {
      projectId: (value) => (!value ? 'Project is required' : null),
      endAt: (value, values) =>
        value <= values.startAt ? 'End time must be after start time' : null,
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data: Partial<TimeEntry> & { projectId: number }) =>
      timeEntriesApi.createWithProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      notifications.show({
        title: 'Success',
        message: 'Time entry created successfully',
        color: 'green',
      });
      closeTimeModal();
      timeForm.reset();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TimeEntry> }) =>
      timeEntriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      notifications.show({
        title: 'Success',
        message: 'Time entry updated successfully',
        color: 'green',
      });
      closeTimeModal();
      timeForm.reset();
      setEditingTimeEntry(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: timeEntriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries-all'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      notifications.show({
        title: 'Success',
        message: 'Time entry deleted successfully',
        color: 'green',
      });
      closeDeleteModal();
      setDeletingTimeEntry(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleOpenCreateTimeModal = () => {
    setEditingTimeEntry(null);
    timeForm.reset();
    openTimeModal();
  };

  const handleOpenEditTimeModal = (timeEntry: TimeEntry) => {
    setEditingTimeEntry(timeEntry);
    timeForm.setValues({
      projectId: timeEntry.projectId.toString(),
      startAt: new Date(timeEntry.startAt),
      endAt: timeEntry.endAt ? new Date(timeEntry.endAt) : new Date(),
      note: timeEntry.note || '',
    });
    openTimeModal();
  };

  const handleOpenDeleteModal = (timeEntry: TimeEntry) => {
    setDeletingTimeEntry(timeEntry);
    openDeleteModal();
  };

  const handleSubmitTime = timeForm.onSubmit((values) => {
    // Ensure startAt and endAt are Date objects
    let startAt = values.startAt;
    let endAt = values.endAt;
    if (typeof startAt === 'string') {
      startAt = new Date(startAt);
    }
    if (typeof endAt === 'string') {
      endAt = new Date(endAt);
    }
    // Validate
    if (!(startAt instanceof Date) || isNaN(startAt.getTime())) {
      notifications.show({
        title: 'Error',
        message: 'Start time is invalid',
        color: 'red',
      });
      return;
    }
    if (!(endAt instanceof Date) || isNaN(endAt.getTime())) {
      notifications.show({
        title: 'Error',
        message: 'End time is invalid',
        color: 'red',
      });
      return;
    }

    const data = {
      projectId: parseInt(values.projectId),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      note: values.note || undefined,
    };

    if (editingTimeEntry) {
      updateTimeEntryMutation.mutate({ id: editingTimeEntry.id, data });
    } else {
      createTimeEntryMutation.mutate(data);
    }
  });

  const handleDeleteTime = () => {
    if (deletingTimeEntry) {
      deleteTimeEntryMutation.mutate(deletingTimeEntry.id);
    }
  };

  const projectOptions = projects?.map((project) => ({
    value: project.id.toString(),
    label: `${project.name} (${project.client?.name || 'Unknown Client'})`,
  })) || [];

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Time Entries</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleOpenCreateTimeModal}
        >
          Add Time Entry
        </Button>
      </Group>

      <TimeEntryList
        timeEntries={timeEntries}
        projects={projects}
        loading={timeEntriesLoading}
        emptyState="No time entries found. Add your first time entry!"
        pagination={timeEntriesResponse?.pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onEdit={handleOpenEditTimeModal}
        onDelete={handleOpenDeleteModal}
        showProjectColumn={true}
        showProjectFilter={true}
        selectedProjectId={selectedProjectId}
        onProjectFilterChange={setSelectedProjectId}
        selectedStatus={selectedStatus}
        onStatusFilterChange={setSelectedStatus}
      />

      <Modal
        opened={timeModalOpened}
        onClose={closeTimeModal}
        title={editingTimeEntry ? 'Edit Time Entry' : 'Add Time Entry'}
        size="lg"
      >
        <form onSubmit={handleSubmitTime}>
          <Stack>
            <Select
              label="Project"
              placeholder="Select a project"
              data={projectOptions}
              required
              searchable
              disabled={editingTimeEntry?.isInvoiced}
              {...timeForm.getInputProps('projectId')}
            />
            <DateTimePicker
              label="Start Time"
              placeholder="Select start time"
              required
              {...timeForm.getInputProps('startAt')}
            />
            <DateTimePicker
              label="End Time"
              placeholder="Select end time"
              required
              {...timeForm.getInputProps('endAt')}
            />
            <Textarea
              label="Note"
              placeholder="Optional note"
              {...timeForm.getInputProps('note')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeTimeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={
                  createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending
                }
              >
                {editingTimeEntry ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Time Entry"
      >
        <Text mb="md">
          Are you sure you want to delete this time entry? This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDeleteTime}
            loading={deleteTimeEntryMutation.isPending}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
