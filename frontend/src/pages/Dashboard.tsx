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
  Group,
  Stack,
  Loader,
  Center,
} from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import { dashboardApi, projectsApi } from '../services/api';
import { useTimer } from '../contexts/TimerContext';
import { DateTime } from 'luxon';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { currentTimer, startTimer } = useTimer();

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

  const { data: projects } = useQuery({
    queryKey: ['projects', 'true'],
    queryFn: () => projectsApi.list('true'),
  });

  const handleStartTimer = async (projectId: number) => {
    await startTimer(projectId);
  };

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
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary?.uninvoicedHoursByProject.map((row) => (
                    <Table.Tr key={row.projectId}>
                      <Table.Td>{row.clientName}</Table.Td>
                      <Table.Td>{row.projectName}</Table.Td>
                      <Table.Td ta="right">{row.totalHours.toFixed(1)}</Table.Td>
                    </Table.Tr>
                  ))}
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

        {/* Outstanding Invoices */}
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Outstanding Invoices
            </Title>
            {summary?.outstandingInvoices.length === 0 ? (
              <Text c="dimmed">No outstanding invoices</Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice #</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Due Date</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th ta="right">Amount</Table.Th>
                    <Table.Th ta="center">Days Overdue</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary?.outstandingInvoices.map((invoice) => (
                    <Table.Tr key={invoice.id}>
                      <Table.Td>{invoice.number}</Table.Td>
                      <Table.Td>{invoice.dateInvoiced}</Table.Td>
                      <Table.Td>{invoice.dueDate}</Table.Td>
                      <Table.Td>{invoice.clientName}</Table.Td>
                      <Table.Td ta="right">NZD {invoice.total.toFixed(2)}</Table.Td>
                      <Table.Td ta="center">
                        {invoice.daysOverdue > 0 ? (
                          <Badge color="red">{invoice.daysOverdue}</Badge>
                        ) : (
                          <Text c="dimmed">-</Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>

        {/* Charts */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Invoiced Amount (Last 12 Months)
            </Title>
            <Line options={chartOptions} data={invoicedChartData} />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Hours Logged (Last 12 Months)
            </Title>
            <Line options={chartOptions} data={hoursChartData} />
          </Card>
        </Grid.Col>

        {/* Active Projects with Timer */}
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Active Projects
            </Title>
            {!projects || projects.length === 0 ? (
              <Text c="dimmed">No active projects</Text>
            ) : (
              <Stack gap="sm">
                {projects.map((project) => (
                  <Group key={project.id} justify="space-between">
                    <div>
                      <Text fw={600}>{project.name}</Text>
                      <Text size="sm" c="dimmed">
                        {project.client?.name} • NZD {project.hourlyRate}/hr
                      </Text>
                    </div>
                    {currentTimer?.projectId === project.id ? (
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
                    )}
                  </Group>
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
