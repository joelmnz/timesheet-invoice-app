import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Button,
  FileInput,
  Alert,
  Table,
  Group,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconDownload, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { importApi } from '../services/api';
import type { ImportPreview, ValidationError } from '../types';

export default function ImportInvoices() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const validateMutation = useMutation({
    mutationFn: importApi.validateInvoices,
    onSuccess: (data) => {
      setPreview(data);
      if (data.valid) {
        notifications.show({
          title: 'Validation Successful',
          message: `${data.invoices.length} invoice(s) ready to import`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Validation Errors Found',
          message: `${data.errors.length} error(s) found. Please review and fix.`,
          color: 'red',
        });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to validate CSV file',
        color: 'red',
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: importApi.confirmInvoices,
    onSuccess: (data) => {
      if (data.success) {
        notifications.show({
          title: 'Import Successful',
          message: data.message,
          color: 'green',
        });
        navigate('/invoices');
      } else {
        notifications.show({
          title: 'Import Failed',
          message: data.message,
          color: 'red',
        });
      }
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to import invoices',
        color: 'red',
      });
    },
  });

  const handleFileChange = async (file: File | null) => {
    setFile(file);
    setPreview(null);
    setCsvContent('');

    if (!file) return;

    try {
      const text = await file.text();
      setCsvContent(text);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to read file',
        color: 'red',
      });
    }
  };

  const handleValidate = () => {
    if (!csvContent) {
      notifications.show({
        title: 'Error',
        message: 'Please select a file first',
        color: 'red',
      });
      return;
    }

    validateMutation.mutate(csvContent);
  };

  const handleConfirm = () => {
    if (!csvContent || !preview?.valid) return;

    confirmMutation.mutate(csvContent);
  };

  const handleDownloadExample = async () => {
    try {
      await importApi.downloadExample();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to download example',
        color: 'red',
      });
    }
  };

  return (
    <Container size="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Import Invoices</Title>
          <Text c="dimmed" size="sm">
            Import historical invoice data from a CSV file
          </Text>
        </div>

        <Paper p="md" withBorder>
          <Stack gap="md">
            <div>
              <Title order={4}>Instructions</Title>
              <Text size="sm" mt="xs">
                1. Ensure all projects exist in the system before importing (go to Projects page to create them)
                <br />
                2. Download the example CSV file to understand the required format
                <br />
                3. Fill in your invoice data following the example format
                <br />
                4. Upload your CSV file for validation
                <br />
                5. Review the preview and fix any errors if needed
                <br />
                6. Confirm the import to add invoices to the system
              </Text>
            </div>

            <div>
              <Title order={5} mb="xs">CSV Format Requirements</Title>
              <Text size="sm" c="dimmed">
                • <strong>Invoice Number:</strong> Unique identifier (required)
                <br />
                • <strong>Invoice Date:</strong> Date in YYYY-MM-DD format (required)
                <br />
                • <strong>Project Name:</strong> Exact name of existing project (required, must exist in system)
                <br />
                • <strong>Invoice Line Description:</strong> Description of the invoice (required)
                <br />
                • <strong>Invoice Amount:</strong> Total amount (required, must be non-negative)
                <br />
                • <strong>Date Invoice Paid:</strong> Payment date in YYYY-MM-DD format (optional, leave blank for unpaid)
              </Text>
            </div>

            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleDownloadExample}
              variant="light"
            >
              Download Example CSV
            </Button>
          </Stack>
        </Paper>

        <Paper p="md" withBorder>
          <Stack gap="md">
            <Title order={4}>Upload Invoice Data</Title>

            <FileInput
              label="Select CSV File"
              placeholder="Choose a CSV file"
              value={file}
              onChange={handleFileChange}
              accept=".csv,text/csv"
              clearable
            />

            <Group>
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleValidate}
                loading={validateMutation.isPending}
                disabled={!file}
              >
                Validate CSV
              </Button>
            </Group>
          </Stack>
        </Paper>

        {preview && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Preview</Title>
                <Badge color={preview.valid ? 'green' : 'red'} size="lg">
                  {preview.valid ? (
                    <>
                      <IconCheck size={16} /> Valid
                    </>
                  ) : (
                    <>
                      <IconX size={16} /> {preview.errors.length} Error(s)
                    </>
                  )}
                </Badge>
              </Group>

              {preview.errors.length > 0 && (
                <Alert icon={<IconAlertCircle size={16} />} title="Validation Errors" color="red">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Row</Table.Th>
                        <Table.Th>Field</Table.Th>
                        <Table.Th>Error</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {preview.errors.map((error: ValidationError, idx: number) => (
                        <Table.Tr key={idx}>
                          <Table.Td>{error.row}</Table.Td>
                          <Table.Td>{error.field}</Table.Td>
                          <Table.Td>{error.message}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Alert>
              )}

              {preview.invoices.length > 0 && (
                <div>
                  <Text size="sm" fw={500} mb="xs">
                    {preview.invoices.length} Invoice(s) to Import:
                  </Text>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Invoice Number</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Project</Table.Th>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Amount</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {preview.invoices.map((invoice, idx) => (
                        <Table.Tr key={idx}>
                          <Table.Td>{invoice.invoiceNumber}</Table.Td>
                          <Table.Td>{invoice.invoiceDate}</Table.Td>
                          <Table.Td>{invoice.projectName}</Table.Td>
                          <Table.Td>{invoice.description}</Table.Td>
                          <Table.Td>${invoice.amount.toFixed(2)}</Table.Td>
                          <Table.Td>
                            <Badge color={invoice.datePaid ? 'green' : 'yellow'}>
                              {invoice.datePaid ? `Paid (${invoice.datePaid})` : 'Unpaid'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </div>
              )}

              {preview.valid && preview.invoices.length > 0 && (
                <Group>
                  <Button
                    leftSection={<IconCheck size={16} />}
                    onClick={handleConfirm}
                    loading={confirmMutation.isPending}
                    color="green"
                  >
                    Confirm Import
                  </Button>
                  <Button variant="subtle" onClick={() => navigate('/invoices')}>
                    Cancel
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
