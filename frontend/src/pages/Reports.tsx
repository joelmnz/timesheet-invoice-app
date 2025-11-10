import { useState, useEffect } from 'react';
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
import { notifications } from '@mantine/notifications';
import { IconFileExport, IconRefresh, IconFilterOff } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { reportsApi } from '../services/api';
import { getFinancialYearStart } from '../utils/financialYear';

type ReportType = 'invoices' | 'income';

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('invoices');
  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const fyStart = getFinancialYearStart();
    return DateTime.fromISO(fyStart).toJSDate();
  });
  const [toDate, setToDate] = useState<Date | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate dates whenever they change
  useEffect(() => {
    if (fromDate && toDate && fromDate > toDate) {
      setValidationError('From Date cannot be after To Date');
    } else {
      setValidationError(null);
    }
  }, [fromDate, toDate]);

  const fromDateISO = fromDate ? DateTime.fromJSDate(fromDate).toISODate() : undefined;
  const toDateISO = toDate ? DateTime.fromJSDate(toDate).toISODate() : undefined;

  const { data: invoicesData, refetch: refetchInvoices } = useQuery({
    queryKey: ['reports', 'invoices', fromDateISO, toDateISO],
    queryFn: () => reportsApi.getInvoices(fromDateISO, toDateISO),
    enabled: reportType === 'invoices' && !validationError,
  });

  const { data: incomeData, refetch: refetchIncome } = useQuery({
    queryKey: ['reports', 'income', fromDateISO, toDateISO],
    queryFn: () => reportsApi.getIncome(fromDateISO, toDateISO),
    enabled: reportType === 'income' && !validationError,
  });

  const data = reportType === 'invoices' ? invoicesData : incomeData;

  const handleRefresh = () => {
    if (reportType === 'invoices') {
      refetchInvoices();
    } else {
      refetchIncome();
    }
  };

  const handleReset = () => {
    const fyStart = getFinancialYearStart();
    setFromDate(DateTime.fromISO(fyStart).toJSDate());
    setToDate(null);
  };

  const handleExportCsv = async () => {
    try {
      await reportsApi.exportCsv('invoices', fromDateISO, toDateISO);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to export CSV',
        color: 'red',
      });
    }
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

            <Group align="flex-end">
              <DatePickerInput
                label="From Date"
                placeholder="Select start date"
                value={fromDate}
                onChange={setFromDate}
                clearable
                style={{ flex: 1 }}
                error={validationError}
              />
              <DatePickerInput
                label="To Date"
                placeholder="Select end date"
                value={toDate}
                onChange={setToDate}
                clearable
                style={{ flex: 1 }}
                error={validationError ? ' ' : undefined}
              />
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefresh}
                disabled={!!validationError}
              >
                Refresh
              </Button>
              <Button
                variant="light"
                leftSection={<IconFilterOff size={16} />}
                onClick={handleReset}
              >
                Reset
              </Button>
            </Group>
          </Stack>
        </Paper>

        {data && !validationError && (
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

        {validationError && (
          <Paper p="md" withBorder>
            <Text c="red" ta="center">
              {validationError}
            </Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
