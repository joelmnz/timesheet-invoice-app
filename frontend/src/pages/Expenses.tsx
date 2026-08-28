import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Badge,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconFilterOff,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { expensesApi, projectsApi } from '../services/api';
import type { Expense } from '../types';
import { getFinancialYearStart } from '../utils/financialYear';
import { formatCurrency } from '../components/lists/format';
import { Pagination } from '../components/common/Pagination';

type ProjectFilter = 'all' | 'general' | string;

export default function Expenses() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectFilter>('all');
  const [fromDate, setFromDate] = useState<string | null>(() => getFinancialYearStart());
  const [toDate, setToDate] = useState<string | null>(null);
  const [expenseModalOpened, { open: openExpenseModal, close: closeExpenseModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const fromDateISO = fromDate ? DateTime.fromISO(fromDate).toISODate() : null;
  const toDateISO = toDate ? DateTime.fromISO(toDate).toISODate() : null;
  const validationError = fromDateISO && toDateISO && fromDateISO > toDateISO
    ? 'From Date cannot be after To Date'
    : null;

  const { data: expensesResponse, isLoading: expensesLoading } = useQuery({
    queryKey: [
      'expenses-all',
      debouncedSearch,
      selectedProject,
      fromDateISO,
      toDateISO,
      page,
      pageSize,
    ],
    queryFn: () => expensesApi.listAll({
      query: debouncedSearch || undefined,
      projectFilter: selectedProject === 'general' ? 'general' : undefined,
      projectId: selectedProject !== 'all' && selectedProject !== 'general'
        ? Number(selectedProject)
        : undefined,
      from: fromDateISO ?? undefined,
      to: toDateISO ?? undefined,
      page,
      pageSize,
    }),
    enabled: !validationError,
  });

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects', 'all-for-expenses'],
    queryFn: () => projectsApi.list('all', 1, 1000),
  });

  const projects = projectsResponse?.data ?? [];
  const expenses = expensesResponse?.data ?? [];

  const expenseForm = useForm({
    initialValues: {
      expenseDate: new Date(),
      description: '',
      amount: 0,
      projectId: 'general',
      isBillable: false,
    },
    validate: {
      expenseDate: (value) => (value instanceof Date && !Number.isNaN(value.getTime())
        ? null
        : 'Expense date is required'),
      amount: (value) => (value <= 0 ? 'Amount must be greater than 0' : null),
    },
  });

  const invalidateExpenseQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses-all'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const createExpenseMutation = useMutation({
    mutationFn: (data: Partial<Expense>) => expensesApi.createGlobal(data),
    onSuccess: () => {
      invalidateExpenseQueries();
      notifications.show({
        title: 'Success',
        message: 'Expense created successfully',
        color: 'green',
      });
      closeExpenseModal();
      expenseForm.reset();
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Expense> }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      invalidateExpenseQueries();
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
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      invalidateExpenseQueries();
      notifications.show({
        title: 'Success',
        message: 'Expense deleted successfully',
        color: 'green',
      });
      closeDeleteModal();
      setDeletingExpense(null);
    },
    onError: (error: Error) => {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    },
  });

  const projectOptions = [
    { value: 'general', label: 'General / No project' },
    ...projects.map((project) => ({
      value: project.id.toString(),
      label: `${project.name} (${project.client?.name || 'Unknown Client'})`,
    })),
  ];

  const filterProjectOptions = [
    { value: 'all', label: 'All projects' },
    ...projectOptions,
  ];

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
      projectId: expense.projectId?.toString() || 'general',
      isBillable: expense.isBillable,
    });
    openExpenseModal();
  };

  const handleOpenDeleteExpenseModal = (expense: Expense) => {
    setDeletingExpense(expense);
    openDeleteModal();
  };

  const handleCloseExpenseModal = () => {
    closeExpenseModal();
    expenseForm.reset();
    setEditingExpense(null);
  };

  const handleSubmitExpense = expenseForm.onSubmit((values) => {
    const projectId = values.projectId && values.projectId !== 'general'
      ? Number(values.projectId)
      : null;
    const data: Partial<Expense> = {
      projectId,
      expenseDate: DateTime.fromJSDate(values.expenseDate).toISODate() || '',
      description: values.description || undefined,
      amount: Number(values.amount),
      isBillable: projectId === null ? false : values.isBillable,
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

  const handleResetFilters = () => {
    setSearch('');
    setSelectedProject('all');
    setFromDate(getFinancialYearStart());
    setToDate(null);
    setPage(1);
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Expenses</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleOpenCreateExpenseModal}
          data-testid="add-expense-btn"
        >
          Add Expense
        </Button>
      </Group>

      <Paper p="md" withBorder mb="lg">
        <Stack gap="md">
          <Group align="flex-end" grow>
            <TextInput
              label="Search"
              placeholder="Search expenses..."
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              leftSection={<IconSearch size={16} />}
              data-testid="expense-search-input"
            />
            <Select
              label="Project"
              data={filterProjectOptions}
              value={selectedProject}
              onChange={(value) => {
                setSelectedProject(value || 'all');
                setPage(1);
              }}
              searchable
              clearable
              onClear={() => {
                setSelectedProject('all');
                setPage(1);
              }}
              data-testid="expense-project-filter"
            />
          </Group>
          <Group align="flex-end">
            <DatePickerInput
              label="From Date"
              placeholder="Select start date"
              value={fromDate}
              onChange={(value) => {
                setFromDate(value);
                setPage(1);
              }}
              clearable
              error={validationError}
              style={{ flex: 1 }}
              data-testid="expense-from-date"
            />
            <DatePickerInput
              label="To Date"
              placeholder="Select end date"
              value={toDate}
              onChange={(value) => {
                setToDate(value);
                setPage(1);
              }}
              clearable
              error={validationError ? ' ' : undefined}
              style={{ flex: 1 }}
              data-testid="expense-to-date"
            />
            <Button
              variant="light"
              leftSection={<IconFilterOff size={16} />}
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          </Group>
        </Stack>
      </Paper>

      {validationError && (
        <Text c="red" mb="md">{validationError}</Text>
      )}

      {expensesResponse && !validationError && (
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">Expense list</Text>
            <Text fw={700} size="xl" c="blue">
              Total expenses: {formatCurrency(expensesResponse.totalAmount)}
            </Text>
          </Group>

          {expensesLoading ? (
            <Center h={200}><Loader /></Center>
          ) : expenses.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No expenses found. Add your first expense!
            </Text>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover miw={900}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Project</Table.Th>
                    <Table.Th ta="right">Amount</Table.Th>
                    <Table.Th ta="center">Billable</Table.Th>
                    <Table.Th ta="center">Invoiced</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {expenses.map((expense) => (
                    <Table.Tr key={expense.id}>
                      <Table.Td>{DateTime.fromISO(expense.expenseDate).toLocaleString(DateTime.DATE_MED)}</Table.Td>
                      <Table.Td>{expense.description || '-'}</Table.Td>
                      <Table.Td>{expense.client?.name || '—'}</Table.Td>
                      <Table.Td>{expense.project?.name || 'General'}</Table.Td>
                      <Table.Td ta="right">{formatCurrency(expense.amount)}</Table.Td>
                      <Table.Td ta="center">
                        <Badge color={expense.isBillable ? 'green' : 'gray'}>
                          {expense.isBillable ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge color={expense.isInvoiced ? 'blue' : 'gray'}>
                          {expense.isInvoiced ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group justify="flex-end" gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleOpenEditExpenseModal(expense)}
                            aria-label="Edit"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleOpenDeleteExpenseModal(expense)}
                            aria-label="Delete"
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
            </Box>
          )}

          {expensesResponse.pagination && (
            <Pagination
              pagination={expensesResponse.pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </Paper>
      )}

      {!expensesResponse && expensesLoading && <Center h={300}><Loader size="lg" /></Center>}

      <Modal
        opened={expenseModalOpened}
        onClose={handleCloseExpenseModal}
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
              data-testid="expense-date-input"
            />
            <Textarea
              label="Description"
              placeholder="Expense description"
              {...expenseForm.getInputProps('description')}
              data-testid="expense-description-input"
            />
            <NumberInput
              label="Amount (NZD)"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...expenseForm.getInputProps('amount')}
              data-testid="expense-amount-input"
            />
            <Select
              label="Project"
              placeholder="General / No project"
              data={projectOptions}
              searchable
              clearable
              disabled={editingExpense?.isInvoiced}
              value={expenseForm.values.projectId}
              onChange={(value) => {
                const projectId = value || 'general';
                expenseForm.setFieldValue('projectId', projectId);
                if (projectId === 'general') {
                  expenseForm.setFieldValue('isBillable', false);
                }
              }}
              error={expenseForm.errors.projectId}
              data-testid="expense-project-input"
            />
            <Stack gap={4}>
              <Switch
                label="Billable"
                checked={expenseForm.values.isBillable}
                onChange={(event) => expenseForm.setFieldValue('isBillable', event.currentTarget.checked)}
                disabled={!expenseForm.values.projectId || expenseForm.values.projectId === 'general'}
                data-testid="expense-billable-input"
              />
              {(!expenseForm.values.projectId || expenseForm.values.projectId === 'general') && (
                <Text size="sm" c="dimmed">
                  General expenses are not client billable.
                </Text>
              )}
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseExpenseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                data-testid="expense-submit-btn"
              >
                {editingExpense ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Delete Expense">
        <Text mb="md">Are you sure you want to delete this expense? This action cannot be undone.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>Cancel</Button>
          <Button color="red" onClick={handleDeleteExpense} loading={deleteExpenseMutation.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
