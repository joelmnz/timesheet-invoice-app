import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Button,
  Group,
  Stack,
  Text,
  Select,
  Card,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconFilter, IconFilterOff, IconUpload } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { invoicesApi, clientsApi, projectsApi } from '../services/api';
import { ListHeader } from '../components/lists/ListHeader';
import { InvoiceList } from '../components/lists/InvoiceList';
import { Pagination } from '../components/common/Pagination';
import { formatCurrency } from '../components/lists/format';

export default function Invoices() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('Sent');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: invoicesResponse, isLoading: invoicesLoading } = useQuery({
    queryKey: [
      'invoices',
      {
        status: statusFilter || undefined,
        clientId: clientFilter ? parseInt(clientFilter) : undefined,
        projectId: projectFilter ? parseInt(projectFilter) : undefined,
        from: fromDate ? DateTime.fromJSDate(fromDate).toISODate() : undefined,
        to: toDate ? DateTime.fromJSDate(toDate).toISODate() : undefined,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      invoicesApi.list({
        status: statusFilter || undefined,
        clientId: clientFilter ? parseInt(clientFilter) : undefined,
        projectId: projectFilter ? parseInt(projectFilter) : undefined,
        from: fromDate ? DateTime.fromJSDate(fromDate).toISODate() || undefined : undefined,
        to: toDate ? DateTime.fromJSDate(toDate).toISODate() || undefined : undefined,
        page,
        pageSize,
      }),
  });

  const invoices = invoicesResponse?.data || [];

  const { data: clientsResponse } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const clients = clientsResponse?.data || [];

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list('all'),
  });

  const projects = projectsResponse?.data || [];

  const handleClearFilters = () => {
    setStatusFilter('');
    setClientFilter('');
    setProjectFilter('');
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter || clientFilter || projectFilter || fromDate || toDate;

  const clientOptions = clients?.map((client) => ({
    value: client.id.toString(),
    label: client.name,
  })) || [];

  const projectOptions = projects?.map((project) => ({
    value: project.id.toString(),
    label: `${project.name} (${project.client?.name})`,
  })) || [];

  const draftAmount = invoices?.filter((inv) => inv.status === 'Draft').reduce((sum, inv) => sum + inv.total, 0) || 0;
  const sentAmount = invoices?.filter((inv) => inv.status === 'Sent').reduce((sum, inv) => sum + inv.total, 0) || 0;
  const paidAmount = invoices?.filter((inv) => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0) || 0;
  const cancelledAmount = invoices?.filter((inv) => inv.status === 'Cancelled').reduce((sum, inv) => sum + inv.total, 0) || 0;

  return (
    <Container size="xl">
      <ListHeader
        title="Invoices"
        action={
          <Group>
            <Button
              variant="outline"
              leftSection={<IconUpload size={16} />}
              onClick={() => navigate('/import/invoices')}
            >
              Import Invoices
            </Button>
            <Button
              variant="light"
              leftSection={filtersExpanded ? <IconFilterOff size={16} /> : <IconFilter size={16} />}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Group>
        }
      >
        <Group mb="md">
          <Button
            variant={statusFilter === '' ? 'filled' : 'light'}
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'Draft' ? 'filled' : 'light'}
            onClick={() => setStatusFilter('Draft')}
          >
            Draft
          </Button>
          <Button
            variant={statusFilter === 'Sent' ? 'filled' : 'light'}
            onClick={() => setStatusFilter('Sent')}
          >
            Sent
          </Button>
          <Button
            variant={statusFilter === 'Paid' ? 'filled' : 'light'}
            onClick={() => setStatusFilter('Paid')}
          >
            Paid
          </Button>
          <Button
            variant={statusFilter === 'Cancelled' ? 'filled' : 'light'}
            onClick={() => setStatusFilter('Cancelled')}
          >
            Cancelled
          </Button>
        </Group>
      </ListHeader>

      {
        filtersExpanded && (
          <Card shadow="sm" padding="lg" mb="xl">
            <Stack gap="md">
              <Group align="flex-end">

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
        )
      }

      <Group mb="md" justify="space-between">
        <Group>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Draft</Text>
            <Text size="lg" fw={700} c="gray">{formatCurrency(draftAmount)}</Text>
          </Card>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Sent</Text>
            <Text size="lg" fw={700} c="orange">{formatCurrency(sentAmount)}</Text>
          </Card>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Paid</Text>
            <Text size="lg" fw={700} c="green">{formatCurrency(paidAmount)}</Text>
          </Card>
          <Card shadow="sm" padding="md">
            <Text size="sm" c="dimmed">Cancelled</Text>
            <Text size="lg" fw={700} c="red">{formatCurrency(cancelledAmount)}</Text>
          </Card>
        </Group>
      </Group>

      <InvoiceList
        invoices={invoices || []}
        loading={invoicesLoading}
        emptyState={hasActiveFilters ? 'No invoices found matching filters' : 'No invoices yet'}
        showDueStatus={true}
        onView={(id) => navigate(`/invoices/${id}`)}
        onDownload={async (id, number, clientName) => {
          try {
            await invoicesApi.downloadPdf(id, number, clientName);
          } catch (error) {
            notifications.show({
              title: 'Error',
              message: error instanceof Error ? error.message : 'Failed to download PDF',
              color: 'red',
            });
          }
        }}
      />
      {
        invoicesResponse && (
          <Pagination
            pagination={invoicesResponse.pagination}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )
      }
    </Container>
  );
}
