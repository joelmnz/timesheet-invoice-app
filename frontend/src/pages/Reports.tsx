import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Table,
  Text,
  Stack,
  SegmentedControl,
  Box,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconFileExport, IconCalendar } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { reportsApi } from '../services/api';

type ReportType = 'invoices' | 'income';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('invoices');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const fromDate = dateRange[0] ? DateTime.fromJSDate(dateRange[0]).toISODate() : undefined;
  const toDate = dateRange[1] ? DateTime.fromJSDate(dateRange[1]).toISODate() : undefined;

  const { data: invoicesData } = useQuery({
    queryKey: ['reports', 'invoices', fromDate, toDate],
    queryFn: () => reportsApi.getInvoices(fromDate, toDate),
    enabled: reportType === 'invoices',
  });

  const { data: incomeData } = useQuery({
    queryKey: ['reports', 'income', fromDate, toDate],
    queryFn: () => reportsApi.getIncome(fromDate, toDate),
    enabled: reportType === 'income',
  });

  const data = reportType === 'invoices' ? invoicesData : incomeData;

  const handleExportCsv = () => {
    reportsApi.exportCsv('invoices', fromDate, toDate);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Reports</Title>
          <Button
            leftSection={<IconFileExport size={18} />}
            onClick={handleExportCsv}
            variant="light"
          >
            Export CSV
          </Button>
        </Group>

        <Paper p="md" withBorder>
          <Stack gap="md">
            <SegmentedControl
              value={reportType}
              onChange={(value) => setReportType(value as ReportType)}
              data={[
                { label: 'Invoices by Date', value: 'invoices' },
                { label: 'Income by Paid Date', value: 'income' },
              ]}
            />

            <DatePickerInput
              type="range"
              label="Date Range"
              placeholder="Pick dates range"
              leftSection={<IconCalendar size={18} />}
              value={dateRange}
              onChange={setDateRange}
              clearable
            />
          </Stack>
        </Paper>

        {data && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">
                  {reportType === 'invoices' ? 'Invoices' : 'Income'} Report
                </Text>
                <Text fw={700} size="xl" c="blue">
                  Total: ${data.total.toFixed(2)}
                </Text>
              </Group>

              {data.data.length > 0 ? (
                <Box style={{ overflowX: 'auto' }}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Invoice #</Table.Th>
                        <Table.Th>Client</Table.Th>
                        <Table.Th>Project</Table.Th>
                        <Table.Th>
                          {reportType === 'invoices' ? 'Invoice Date' : 'Paid Date'}
                        </Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.data.map((row: any) => (
                        <Table.Tr key={row.id}>
                          <Table.Td>{row.number}</Table.Td>
                          <Table.Td>{row.clientName}</Table.Td>
                          <Table.Td>{row.projectName}</Table.Td>
                          <Table.Td>
                            {DateTime.fromISO(
                              reportType === 'invoices' ? row.dateInvoiced : row.datePaid
                            ).toLocaleString(DateTime.DATE_MED)}
                          </Table.Td>
                          <Table.Td>{row.status}</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            ${row.total.toFixed(2)}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              ) : (
                <Text c="dimmed" ta="center" py="xl">
                  No data for selected date range
                </Text>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
