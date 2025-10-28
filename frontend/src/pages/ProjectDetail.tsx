import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Tabs,
  Button,
  Table,
  Group,
  Modal,
  Stack,
  Loader,
  Center,
  Text,
  ActionIcon,
  TextInput,
  NumberInput,
  Textarea,
  Card,
  Badge,
  Switch,
  Select,
} from '@mantine/core';
import { DateTimePicker, DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowLeft,
  IconFileInvoice,
} from '@tabler/icons-react';
import { DateTime } from 'luxon';
import {
  projectsApi,
  timeEntriesApi,
  expensesApi,
  invoicesApi,
  clientsApi,
} from '../services/api';
import type { TimeEntry, Expense, Project } from '../types';
import { InvoiceList } from '../components/lists/InvoiceList';
import { Pagination } from '../components/common/Pagination';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = parseInt(id || '0');

  const [activeTab, setActiveTab] = useState<string | null>('time');
  const [timeModalOpened, { open: openTimeModal, close: closeTimeModal }] = useDisclosure(false);
  const [expenseModalOpened, { open: openExpenseModal, close: closeExpenseModal }] = useDisclosure(false);
  const [invoiceModalOpened, { open: openInvoiceModal, close: closeInvoiceModal }] = useDisclosure(false);
  const [deleteTimeModalOpened, { open: openDeleteTimeModal, close: closeDeleteTimeModal }] = useDisclosure(false);
  const [deleteExpenseModalOpened, { open: openDeleteExpenseModal, close: closeDeleteExpenseModal }] = useDisclosure(false);
  const [editProjectModalOpened, { open: openEditProjectModal, close: closeEditProjectModal }] = useDisclosure(false);
  
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingTimeEntry, setDeletingTimeEntry] = useState<TimeEntry | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Pagination state
  const [timePage, setTimePage] = useState(1);
  const [timePageSize, setTimePageSize] = useState(25);
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(25);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(25);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const { data: timeEntriesResponse, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['time-entries', projectId, timePage, timePageSize],
    queryFn: () => timeEntriesApi.list(projectId, timePage, timePageSize),
  });

  const { data: expensesResponse, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', projectId, expensePage, expensePageSize],
    queryFn: () => expensesApi.list(projectId, expensePage, expensePageSize),
  });

  const { data: invoicesResponse, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', { projectId, page: invoicePage, pageSize: invoicePageSize }],
    queryFn: () => invoicesApi.list({ projectId, page: invoicePage, pageSize: invoicePageSize }),
  });

  const timeEntries = timeEntriesResponse?.data || [];
  const expenses = expensesResponse?.data || [];
  const invoices = invoicesResponse?.data || [];

  const projectForm = useForm({
    initialValues: {
      name: '',
      clientId: '',
      hourlyRate: 0,
      notes: '',
      active: true,
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? 'Name is required' : null),
      clientId: (value) => (!value ? 'Client is required' : null),
      hourlyRate: (value) => (value <= 0 ? 'Hourly rate must be greater than 0' : null),
    },
  });

  const timeForm = useForm({
    initialValues: {
      startAt: new Date(),
      endAt: new Date(),
      note: '',
    },
    validate: {
      endAt: (value, values) =>
        value <= values.startAt ? 'End time must be after start time' : null,
    },
  });

  const expenseForm = useForm({
    initialValues: {
      expenseDate: new Date(),
      description: '',
      amount: 0,
      isBillable: true,
    },
    validate: {
      amount: (value) => (value <= 0 ? 'Amount must be greater than 0' : null),
    },
  });

  const invoiceForm = useForm({
    initialValues: {
      dateInvoiced: new Date(),
      upToDate: new Date(),
      notes: '',
      groupByDay: false,
    },
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data: Partial<TimeEntry>) =>
      timeEntriesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', projectId] });
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
      queryClient.invalidateQueries({ queryKey: ['time-entries', projectId] });
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
      queryClient.invalidateQueries({ queryKey: ['time-entries', projectId] });
      notifications.show({
        title: 'Success',
        message: 'Time entry deleted successfully',
        color: 'green',
      });
      closeDeleteTimeModal();
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

  const createExpenseMutation = useMutation({
    mutationFn: (data: Partial<Expense>) =>
      expensesApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      notifications.show({
        title: 'Success',
        message: 'Expense created successfully',
        color: 'green',
      });
      closeExpenseModal();
      expenseForm.reset();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      notifications.show({
        title: 'Success',
        message: 'Expense updated successfully',
        color: 'green',
      });
      closeExpenseModal();
      expenseForm.reset();
      setEditingExpense(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      notifications.show({
        title: 'Success',
        message: 'Expense deleted successfully',
        color: 'green',
      });
      closeDeleteExpenseModal();
      setDeletingExpense(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: {
      dateInvoiced: string;
      upToDate: string;
      notes?: string;
      groupByDay?: boolean;
    }) => invoicesApi.create(projectId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries', projectId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      notifications.show({
        title: 'Success',
        message: 'Invoice created successfully',
        color: 'green',
      });
      closeInvoiceModal();
      invoiceForm.reset();
      navigate(`/invoices/${data.invoice.id}`);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleCloseEditProjectModal = () => {
    projectForm.reset();
    closeEditProjectModal();
  };

  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      notifications.show({
        title: 'Success',
        message: 'Project updated successfully',
        color: 'green',
      });
      handleCloseEditProjectModal();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleOpenEditProjectModal = () => {
    if (!project) return;

    projectForm.setValues({
      name: project.name,
      clientId: project.clientId.toString(),
      hourlyRate: project.hourlyRate,
      notes: project.notes ?? '',
      active: project.active,
    });

    openEditProjectModal();
  };

  const handleSubmitProject = projectForm.onSubmit((values) => {
    const payload: Partial<Project> = {
      name: values.name.trim(),
      clientId: parseInt(values.clientId),
      hourlyRate: Number(values.hourlyRate),
      notes: values.notes.trim() ? values.notes : undefined,
      active: values.active,
    };

    updateProjectMutation.mutate(payload);
  });

  const handleOpenCreateTimeModal = () => {
    setEditingTimeEntry(null);
    timeForm.reset();
    openTimeModal();
  };

  const handleOpenEditTimeModal = (timeEntry: TimeEntry) => {
    setEditingTimeEntry(timeEntry);
    timeForm.setValues({
      startAt: new Date(timeEntry.startAt),
      endAt: timeEntry.endAt ? new Date(timeEntry.endAt) : new Date(),
      note: timeEntry.note || '',
    });
    openTimeModal();
  };

  const handleOpenDeleteTimeModal = (timeEntry: TimeEntry) => {
    setDeletingTimeEntry(timeEntry);
    openDeleteTimeModal();
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

  const handleOpenCreateExpenseModal = () => {
    setEditingExpense(null);
    expenseForm.reset();
    openExpenseModal();
  };

  const handleOpenEditExpenseModal = (expense: Expense) => {
    setEditingExpense(expense);
    expenseForm.setValues({
      expenseDate: new Date(expense.expenseDate),
      description: expense.description || '',
      amount: expense.amount,
      isBillable: expense.isBillable,
    });
    openExpenseModal();
  };

  const handleOpenDeleteExpenseModal = (expense: Expense) => {
    setDeletingExpense(expense);
    openDeleteExpenseModal();
  };

  const handleSubmitExpense = expenseForm.onSubmit((values) => {
    const data = {
      expenseDate: DateTime.fromJSDate(values.expenseDate).toISODate() || '',
      description: values.description || undefined,
      amount: values.amount,
      isBillable: values.isBillable,
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  });

  const handleDeleteExpense = () => {
    if (deletingExpense) {
      deleteExpenseMutation.mutate(deletingExpense.id);
    }
  };

  const handleSubmitInvoice = invoiceForm.onSubmit((values) => {
    const data = {
      dateInvoiced: DateTime.fromJSDate(values.dateInvoiced).toISODate() || '',
      upToDate: DateTime.fromJSDate(values.upToDate).toISODate() || '',
      notes: values.notes || undefined,
      groupByDay: values.groupByDay,
    };
    createInvoiceMutation.mutate(data);
  });

  if (projectLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!project) {
    return (
      <Container size="xl">
        <Text c="red">Project not found</Text>
      </Container>
    );
  }

  const uninvoicedHours = timeEntries?.filter((t) => !t.isInvoiced).reduce((sum, t) => sum + t.totalHours, 0) || 0;
  const uninvoicedExpenses = expenses?.filter((e) => !e.isInvoiced && e.isBillable).reduce((sum, e) => sum + e.amount, 0) || 0;

  const clientOptions = clients?.map((client) => ({
    value: client.id.toString(),
    label: `${client.name} (NZD ${client.defaultHourlyRate}/hr)`,
  })) || [];

  return (
    <Container size="xl">
      {/* Edit Project Modal */}
      <Modal
        opened={editProjectModalOpened}
        onClose={handleCloseEditProjectModal}
        title="Edit Project"
        size="lg"
      >
        <form onSubmit={handleSubmitProject}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Project name"
              required
              {...projectForm.getInputProps('name')}
            />
            <Select
              label="Client"
              placeholder="Select a client"
              data={clientOptions}
              required
              searchable
              {...projectForm.getInputProps('clientId')}
            />
            <NumberInput
              label="Hourly Rate (NZD)"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...projectForm.getInputProps('hourlyRate')}
            />
            <Textarea
              label="Notes"
              placeholder="Project notes"
              autosize
              minRows={3}
              {...projectForm.getInputProps('notes')}
            />
            <Switch
              label="Active"
              {...projectForm.getInputProps('active', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseEditProjectModal}>
                Cancel
              </Button>
              <Button type="submit" loading={updateProjectMutation.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/projects')}
        mb="md"
      >
        Back to Projects
      </Button>

      <Card shadow="sm" padding="lg" mb="xl">
        <Group justify="space-between">
          <div>
            <Title order={1}>{project.name}</Title>
            <Text size="lg" c="dimmed" mt="xs">
              {project.client?.name} • NZD {project.hourlyRate.toFixed(2)}/hr
            </Text>
          </div>
          <Group gap="xs">
            <Badge color={project.active ? 'green' : 'gray'} size="lg">
              {project.active ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={handleOpenEditProjectModal}
            >
              Edit
            </Button>
          </Group>
        </Group>
        {project.notes && (
          <Textarea
            mt="md"
            label="Notes"
            value={project.notes}
            readOnly
            autosize
            minRows={3}
            variant="filled"
          />
        )}
      </Card>

      <Card shadow="sm" padding="lg" mb="xl">
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">Uninvoiced Hours</Text>
            <Text size="xl" fw={700}>{uninvoicedHours.toFixed(1)} hrs</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Uninvoiced Expenses</Text>
            <Text size="xl" fw={700}>NZD {uninvoicedExpenses.toFixed(2)}</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Potential Value</Text>
            <Text size="xl" fw={700}>
              NZD {((uninvoicedHours * project.hourlyRate) + uninvoicedExpenses).toFixed(2)}
            </Text>
          </div>
          <Button
            leftSection={<IconFileInvoice size={16} />}
            onClick={() => openInvoiceModal()}
            disabled={uninvoicedHours === 0 && uninvoicedExpenses === 0}
            data-testid="create-invoice-btn"
          >
            Create Invoice
          </Button>
        </Group>
      </Card>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="time">Time Entries</Tabs.Tab>
          <Tabs.Tab value="expenses">Expenses</Tabs.Tab>
          <Tabs.Tab value="invoices">Invoices</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="time" pt="md">
          <Group justify="flex-end" mb="md">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleOpenCreateTimeModal}
              data-testid="add-time-entry-btn"
            >
              Add Time Entry
            </Button>
          </Group>

          {timeEntriesLoading ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : !timeEntries || timeEntries.length === 0 ? (
            <Text c="dimmed" ta="center" mt="xl">
              No time entries yet. Add your first time entry!
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Start</Table.Th>
                  <Table.Th>End</Table.Th>
                  <Table.Th ta="right">Hours</Table.Th>
                  <Table.Th>Note</Table.Th>
                  <Table.Th ta="center">Status</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
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
                    <Table.Td>{entry.note || '-'}</Table.Td>
                    <Table.Td ta="center">
                      <Badge color={entry.isInvoiced ? 'blue' : 'gray'}>
                        {entry.isInvoiced ? 'Invoiced' : 'Uninvoiced'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenEditTimeModal(entry)}
                          disabled={entry.isInvoiced}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleOpenDeleteTimeModal(entry)}
                          disabled={entry.isInvoiced}
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
          {timeEntriesResponse && (
            <Pagination
              pagination={timeEntriesResponse.pagination}
              onPageChange={(page) => setTimePage(page)}
              onPageSizeChange={(size) => {
                setTimePageSize(size);
                setTimePage(1);
              }}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="expenses" pt="md">
          <Group justify="flex-end" mb="md">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleOpenCreateExpenseModal}
            >
              Add Expense
            </Button>
          </Group>

          {expensesLoading ? (
            <Center h={200}>
              <Loader />
            </Center>
          ) : !expenses || expenses.length === 0 ? (
            <Text c="dimmed" ta="center" mt="xl">
              No expenses yet. Add your first expense!
            </Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th ta="right">Amount</Table.Th>
                  <Table.Th ta="center">Billable</Table.Th>
                  <Table.Th ta="center">Status</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {expenses.map((expense) => (
                  <Table.Tr key={expense.id}>
                    <Table.Td>{expense.expenseDate}</Table.Td>
                    <Table.Td>{expense.description || '-'}</Table.Td>
                    <Table.Td ta="right">NZD {expense.amount.toFixed(2)}</Table.Td>
                    <Table.Td ta="center">
                      <Badge color={expense.isBillable ? 'green' : 'gray'}>
                        {expense.isBillable ? 'Yes' : 'No'}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge color={expense.isInvoiced ? 'blue' : 'gray'}>
                        {expense.isInvoiced ? 'Invoiced' : 'Uninvoiced'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenEditExpenseModal(expense)}
                          disabled={expense.isInvoiced}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleOpenDeleteExpenseModal(expense)}
                          disabled={expense.isInvoiced}
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
          {expensesResponse && (
            <Pagination
              pagination={expensesResponse.pagination}
              onPageChange={(page) => setExpensePage(page)}
              onPageSizeChange={(size) => {
                setExpensePageSize(size);
                setExpensePage(1);
              }}
            />
          )}
        </Tabs.Panel>

        <Tabs.Panel value="invoices" pt="md">
          <InvoiceList
            invoices={invoices || []}
            loading={invoicesLoading}
            emptyState="No invoices yet. Create your first invoice!"
            compact
            onView={(id) => navigate(`/invoices/${id}`)}
            onDownload={async (id, number) => {
              try {
                await invoicesApi.downloadPdf(id, number);
              } catch (error) {
                notifications.show({
                  title: 'Error',
                  message: error instanceof Error ? error.message : 'Failed to download PDF',
                  color: 'red',
                });
              }
            }}
          />
          {invoicesResponse && (
            <Pagination
              pagination={invoicesResponse.pagination}
              onPageChange={(page) => setInvoicePage(page)}
              onPageSizeChange={(size) => {
                setInvoicePageSize(size);
                setInvoicePage(1);
              }}
            />
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={timeModalOpened}
        onClose={closeTimeModal}
        title={editingTimeEntry ? 'Edit Time Entry' : 'Add Time Entry'}
        size="lg"
      >
        <form onSubmit={handleSubmitTime}>
          <Stack>
            <DateTimePicker
              label="Start Time"
              placeholder="Select start time"
              required
              {...timeForm.getInputProps('startAt')}
              data-testid="time-start-input"
            />
            <DateTimePicker
              label="End Time"
              placeholder="Select end time"
              required
              {...timeForm.getInputProps('endAt')}
              data-testid="time-end-input"
            />
            <Textarea
              label="Note"
              placeholder="Optional note"
              {...timeForm.getInputProps('note')}
              data-testid="time-note-input"
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
                data-testid="time-submit-btn"
              >
                {editingTimeEntry ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteTimeModalOpened}
        onClose={closeDeleteTimeModal}
        title="Delete Time Entry"
      >
        <Text mb="md">
          Are you sure you want to delete this time entry? This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteTimeModal}>
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

      <Modal
        opened={expenseModalOpened}
        onClose={closeExpenseModal}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="lg"
      >
        <form onSubmit={handleSubmitExpense}>
          <Stack>
            <DatePickerInput
              label="Expense Date"
              placeholder="Select date"
              required
              {...expenseForm.getInputProps('expenseDate')}
            />
            <Textarea
              label="Description"
              placeholder="Expense description"
              {...expenseForm.getInputProps('description')}
            />
            <NumberInput
              label="Amount (NZD)"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...expenseForm.getInputProps('amount')}
            />
            <Switch
              label="Billable"
              {...expenseForm.getInputProps('isBillable', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeExpenseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={
                  createExpenseMutation.isPending || updateExpenseMutation.isPending
                }
              >
                {editingExpense ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteExpenseModalOpened}
        onClose={closeDeleteExpenseModal}
        title="Delete Expense"
      >
        <Text mb="md">
          Are you sure you want to delete this expense? This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteExpenseModal}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDeleteExpense}
            loading={deleteExpenseMutation.isPending}
          >
            Delete
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={invoiceModalOpened}
        onClose={closeInvoiceModal}
        title="Create Invoice"
        size="lg"
      >
        <form onSubmit={handleSubmitInvoice}>
          <Stack>
            <DatePickerInput
              label="Invoice Date"
              placeholder="Select date"
              required
              {...invoiceForm.getInputProps('dateInvoiced')}
              data-testid="invoice-date-input"
            />
            <DatePickerInput
              label="Include items up to"
              placeholder="Select date"
              required
              {...invoiceForm.getInputProps('upToDate')}
              data-testid="invoice-upto-input"
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...invoiceForm.getInputProps('notes')}
              data-testid="invoice-notes-input"
            />
            <Switch
              label="Group time entries by day"
              {...invoiceForm.getInputProps('groupByDay', { type: 'checkbox' })}
              data-testid="invoice-groupby-switch"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeInvoiceModal}>
                Cancel
              </Button>
              <Button type="submit" loading={createInvoiceMutation.isPending} data-testid="invoice-submit-btn">
                Create Invoice
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
