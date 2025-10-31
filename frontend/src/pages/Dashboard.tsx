import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Table,
  Badge,
  Button,
  Loader,
  Center,
  Anchor,
} from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { Bar } from 'react-chartjs-2';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import { dashboardApi, projectsApi } from '../services/api';
import { useTimer } from '../contexts/TimerContext';
import { DateTime } from 'luxon';
import { ProjectList } from '../components/lists/ProjectList';
import { EntityTable, Column } from '../components/lists/EntityTable';
import { formatCurrency } from '../components/lists/format';
import { useState } from 'react';
import TimerNotesModal from '../components/TimerNotesModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentTimer, startTimer, updateTimerNotes } = useTimer();
  const [notesModalOpened, setNotesModalOpened] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
  });

  const { data: invoicedData, isLoading: invoicedLoading } = useQuery({
    queryKey: ['invoiced-by-month'],
    queryFn: () => dashboardApi.getInvoicedByMonth(12),
  });

  const { data: hoursData, isLoading: hoursLoading } = useQuery({
    queryKey: ['hours-by-month'],
    queryFn: () => dashboardApi.getHoursByMonth(12),
  });

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects', 'true'],
    queryFn: () => projectsApi.list('true'),
  });

  const projects = projectsResponse?.data || [];

  const handleStartTimer = async (projectId: number) => {
    try {
      await startTimer(projectId);
      setNotesModalOpened(true);
    } catch (error) {
      // Optionally handle error (e.g., show notification)
      console.error('Failed to start timer:', error);
    }
  };

  const outstandingInvoicesColumns: Column<{
    id: number;
    number: string;
    dateInvoiced: string;
    dueDate: string;
    clientName: string;
    total: number;
    daysOverdue: number;
  }>[] = [
    {
      key: 'number',
      title: 'Invoice #',
      render: (invoice) => (
        <Anchor component={Link} to={`/invoices/${invoice.id}`} fw={600}>
          {invoice.number}
        </Anchor>
      ),
    },
    {
      key: 'dateInvoiced',
      title: 'Date',
      render: (invoice) => invoice.dateInvoiced,
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      render: (invoice) => invoice.dueDate,
    },
    {
      key: 'clientName',
      title: 'Client',
      render: (invoice: any) => invoice.clientName,
    },
    {
      key: 'total',
      title: 'Amount',
      align: 'right' as const,
      render: (invoice) => formatCurrency(invoice.total),
    },
    {
      key: 'daysOverdue',
      title: 'Days Overdue',
      align: 'center' as const,
      render: (invoice: any) =>
        invoice.daysOverdue > 0 ? (
          <Badge color="red">{invoice.daysOverdue}</Badge>
        ) : (
          <Text c="dimmed">-</Text>
        ),
    },
  ];

  if (summaryLoading || invoicedLoading || hoursLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Prepare chart data
  const invoicedChartData = {
    labels: invoicedData?.map((d) => DateTime.fromISO(d.month).toFormat('MMM yyyy')) || [],
    datasets: [
      {
        label: 'Amount Invoiced (NZD)',
        data: invoicedData?.map((d) => d.total) || [],
        borderColor: 'rgb(25, 113, 194)',
        backgroundColor: 'rgba(25, 113, 194, 0.5)',
      },
    ],
  };

  const hoursChartData = {
    labels: hoursData?.map((d) => DateTime.fromISO(d.month).toFormat('MMM yyyy')) || [],
    datasets: [
      {
        label: 'Hours Logged',
        data: hoursData?.map((d) => d.totalHours) || [],
        borderColor: 'rgb(34, 139, 34)',
        backgroundColor: 'rgba(34, 139, 34, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <Container size="xl">
      <Title order={1} mb="xl">
        Dashboard
      </Title>

      <Grid>
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Active Projects
            </Title>
            <ProjectList
              projects={projects || []}
              variant="compact"
              emptyState="No active projects"
              onView={(id) => navigate(`/projects/${id}`)}
              getRightAction={(project) =>
                currentTimer?.projectId === project.id ? (
                  <Badge size="lg" color="red">
                    Timer Running
                  </Badge>
                ) : (
                  <Button
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={() => handleStartTimer(project.id)}
                    disabled={!!currentTimer}
                  >
                    Start Timer
                  </Button>
                )
              }
            />
          </Card>
        </Grid.Col>
      
        {/* Uninvoiced Hours */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Uninvoiced Hours
            </Title>
            {summary?.uninvoicedHoursByProject.length === 0 ? (
              <Text c="dimmed">No uninvoiced hours</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Project</Table.Th>
                    <Table.Th ta="right">Hours</Table.Th>
                    <Table.Th ta="right">Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary?.uninvoicedHoursByProject.map((row) => (
                    <Table.Tr key={row.projectId}>
                      <Table.Td>
                        <Anchor component={Link} to={`/clients/${row.clientId}`}>
                          {row.clientName}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Anchor component={Link} to={`/projects/${row.projectId}`}>
                          {row.projectName}
                        </Anchor>
                      </Table.Td>
                      <Table.Td ta="right">{row.totalHours.toFixed(1)}</Table.Td>
                      <Table.Td ta="right">{formatCurrency(row.totalAmount)}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr>
                    <Table.Td colSpan={2} fw={700}>Total</Table.Td>
                    <Table.Td ta="right" fw={700}>
                      {summary?.uninvoicedHoursByProject
                        .reduce((sum, row) => sum + row.totalHours, 0)
                        .toFixed(1)}
                    </Table.Td>
                    <Table.Td ta="right" fw={700}>
                      {formatCurrency(
                        summary?.uninvoicedHoursByProject
                          .reduce((sum, row) => sum + row.totalAmount, 0) || 0
                      )}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>

        {/* Uninvoiced Expenses */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Uninvoiced Expenses
            </Title>
            {summary?.uninvoicedExpensesByProject.length === 0 ? (
              <Text c="dimmed">No uninvoiced expenses</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Project</Table.Th>
                    <Table.Th ta="right">Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary?.uninvoicedExpensesByProject.map((row) => (
                    <Table.Tr key={row.projectId}>
                      <Table.Td>{row.clientName}</Table.Td>
                      <Table.Td>{row.projectName}</Table.Td>
                      <Table.Td ta="right">NZD {row.totalAmount.toFixed(2)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Outstanding Invoices
            </Title>
            <EntityTable
              columns={outstandingInvoicesColumns}
              rows={summary?.outstandingInvoices || []}
              emptyState="No outstanding invoices"
              getRowKey={(invoice) => invoice.id}
            />
          </Card>
        </Grid.Col>

        {/* Charts */}
        <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg">
              <Title order={3} mb="md">
                Invoiced Amount (Last 12 Months)
              </Title>
              <Bar options={chartOptions} data={invoicedChartData} />
            </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Hours Logged (Last 12 Months)
            </Title>
            <Bar options={chartOptions} data={hoursChartData} />
          </Card>
        </Grid.Col>
      </Grid>

      <TimerNotesModal
        opened={notesModalOpened}
        onClose={() => setNotesModalOpened(false)}
        currentTimer={currentTimer}
        onSave={updateTimerNotes}
      />
    </Container>
  );
}
