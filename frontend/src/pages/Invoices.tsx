import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  Stack,
  Loader,
  Center,
  Text,
  ActionIcon,
  Badge,
  Select,
  Card,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconEye, IconDownload, IconFilter, IconFilterOff } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { invoicesApi, clientsApi, projectsApi } from '../services/api';

export default function Invoices() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: [
      'invoices',
      {
        status: statusFilter || undefined,
        clientId: clientFilter ? parseInt(clientFilter) : undefined,
        projectId: projectFilter ? parseInt(projectFilter) : undefined,
        from: fromDate ? DateTime.fromJSDate(fromDate).toISODate() : undefined,
        to: toDate ? DateTime.fromJSDate(toDate).toISODate() : undefined,
      },
    ],
    queryFn: () =>
      invoicesApi.list({
        status: statusFilter || undefined,
        clientId: clientFilter ? parseInt(clientFilter) : undefined,
        projectId: projectFilter ? parseInt(projectFilter) : undefined,
        from: fromDate ? DateTime.fromJSDate(fromDate).toISODate() || undefined : undefined,
        to: toDate ? DateTime.fromJSDate(toDate).toISODate() || undefined : undefined,
      }),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list('all'),
  });

  const handleClearFilters = () => {
    setStatusFilter('');
    setClientFilter('');
    setProjectFilter('');
    setFromDate(null);
    setToDate(null);
  };

  const hasActiveFilters =
    statusFilter || clientFilter || projectFilter || fromDate || toDate;

  if (invoicesLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  const clientOptions = clients?.map((client) => ({
    value: client.id.toString(),
    label: client.name,
  })) || [];

  const projectOptions = projects?.map((project) => ({
    value: project.id.toString(),
    label: `${project.name} (${project.client?.name})`,
  })) || [];

  const totalAmount = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;
  const paidAmount = invoices?.filter((inv) => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0) || 0;
  const unpaidAmount = invoices?.filter((inv) => inv.status === 'Unpaid').reduce((sum, inv) => sum + inv.total, 0) || 0;

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Invoices</Title>
        <Button
          variant="light"
          leftSection={filtersExpanded ? <IconFilterOff size={16} /> : <IconFilter size={16} />}
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </Group>

      {filtersExpanded && (
        <Card shadow="sm" padding="lg" mb="xl">
          <Stack gap="md">
            <Group align="flex-end">
              <Select
                label="Status"
                placeholder="All statuses"
                data={[
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Unpaid', label: 'Unpaid' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value || '')}
                clearable
                style={{ flex: 1 }}
              />
              <Select
                label="Client"
                placeholder="All clients"
                data={clientOptions}
                value={clientFilter}
                onChange={(value) => setClientFilter(value || '')}
                clearable
                searchable
                style={{ flex: 1 }}
              />
              <Select
                label="Project"
                placeholder="All projects"
                data={projectOptions}
                value={projectFilter}
                onChange={(value) => setProjectFilter(value || '')}
                clearable
                searchable
                style={{ flex: 1 }}
              />
            </Group>
            <Group align="flex-end">
              <DatePickerInput
                label="From Date"
                placeholder="Select start date"
                value={fromDate}
                onChange={setFromDate}
                clearable
                style={{ flex: 1 }}
              />
              <DatePickerInput
                label="To Date"
                placeholder="Select end date"
                value={toDate}
                onChange={setToDate}
                clearable
                style={{ flex: 1 }}
              />
              {hasActiveFilters && (
                <Button variant="light" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </Group>
          </Stack>
        </Card>
      )}

      <Group mb="md" justify="space-between">
        <Group>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Total</Text>
            <Text size="lg" fw={700}>NZD {totalAmount.toFixed(2)}</Text>
          </Card>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Paid</Text>
            <Text size="lg" fw={700} c="green">NZD {paidAmount.toFixed(2)}</Text>
          </Card>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Unpaid</Text>
            <Text size="lg" fw={700} c="orange">NZD {unpaidAmount.toFixed(2)}</Text>
          </Card>
        </Group>
      </Group>

      {!invoices || invoices.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          {hasActiveFilters ? 'No invoices found matching filters' : 'No invoices yet'}
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice #</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Project</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Due Date</Table.Th>
              <Table.Th ta="right">Total</Table.Th>
              <Table.Th ta="center">Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {invoices.map((invoice) => {
              const dueDate = DateTime.fromISO(invoice.dueDate);
              const today = DateTime.now();
              const isOverdue = invoice.status === 'Unpaid' && dueDate < today;

              return (
                <Table.Tr key={invoice.id}>
                  <Table.Td>{invoice.number}</Table.Td>
                  <Table.Td>{invoice.client?.name || '-'}</Table.Td>
                  <Table.Td>{invoice.project?.name || '-'}</Table.Td>
                  <Table.Td>{invoice.dateInvoiced}</Table.Td>
                  <Table.Td>
                    {invoice.dueDate}
                    {isOverdue && (
                      <Text size="xs" c="red" span> (Overdue)</Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">NZD {invoice.total.toFixed(2)}</Table.Td>
                  <Table.Td ta="center">
                    <Badge color={invoice.status === 'Paid' ? 'green' : 'orange'}>
                      {invoice.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="gray"
                        onClick={() =>
                          invoicesApi.downloadPdf(invoice.id, invoice.number)
                        }
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Container>
  );
}
