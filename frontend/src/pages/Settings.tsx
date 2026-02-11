import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Button,
  Stack,
  Loader,
  Center,
  TextInput,
  Textarea,
  NumberInput,
  Card,
  Group,
  Text,
  Divider,
  Alert,
  Code,
  List,
  Paper,
  Anchor,
  Table,
  Badge,
  ActionIcon,
  Modal,
  Tabs,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle, IconKey, IconBook, IconTrash } from '@tabler/icons-react';
import { settingsApi } from '../services/api';
import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiKeySummary } from '../types';

export default function Settings() {
  const queryClient = useQueryClient();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [deletingApiKey, setDeletingApiKey] = useState<ApiKeySummary | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const { data: apiKeyData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: settingsApi.getApiKeys,
  });

  const form = useForm({
    initialValues: {
      companyName: '',
      companyAddress: '',
      companyEmail: '',
      companyPhone: '',
      invoiceFooterMarkdown: '',
      nextInvoiceNumber: 1,
      timezone: '',
    },
    validate: {
      companyName: (value) => (!value ? 'Company name is required' : null),
      companyEmail: (value) =>
        value && !/^\S+@\S+$/.test(value) ? 'Invalid email' : null,
      nextInvoiceNumber: (value) =>
        value < 1 ? 'Invoice number must be at least 1' : null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      notifications.show({
        title: 'Success',
        message: 'Settings updated successfully',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: settingsApi.generateApiKey,
    onSuccess: (data) => {
      setNewApiKey(data.apiKey);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      notifications.show({
        title: 'API key generated',
        message: 'Your previous active key was revoked. Save this new key now.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: settingsApi.deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      notifications.show({
        title: 'Success',
        message: 'API key deleted successfully',
        color: 'green',
      });
      closeDeleteModal();
      setDeletingApiKey(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    updateMutation.mutate(values);
  });

  const handleCopyApiKey = async () => {
    if (!newApiKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(newApiKey);
      notifications.show({
        title: 'Copied',
        message: 'API key copied to clipboard',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Copy failed',
        message: 'Unable to copy API key from this browser',
        color: 'red',
      });
    }
  };

  const handleOpenDeleteModal = (apiKey: ApiKeySummary) => {
    setDeletingApiKey(apiKey);
    openDeleteModal();
  };

  const handleDeleteApiKey = () => {
    if (!deletingApiKey) {
      return;
    }

    deleteApiKeyMutation.mutate(deletingApiKey.id);
  };

  const footerPreview = useMemo(() => {
    const text = form.values.invoiceFooterMarkdown || '';
    if (!text) return '';

    const currentDate = DateTime.now().toFormat('dd MMM yyyy');
    const sampleVariables: Record<string, string> = {
      '{DATE}': currentDate,
      '{INVOICE_DATE}': '15 Jan 2025',
      '{INVOICE_NO}': 'INV-0123',
      '{CLIENT_NAME}': 'Example Client Ltd',
      '{TOTAL_AMOUNT}': 'NZD 1,500.00',
      '{COMPANY_NAME}': form.values.companyName || 'Your Company',
      '{COMPANY_ADDRESS}': form.values.companyAddress || 'Your Address',
    };

    let result = text;
    Object.entries(sampleVariables).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return result;
  }, [form.values.invoiceFooterMarkdown, form.values.companyName, form.values.companyAddress]);

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (settings && !form.isDirty()) {
    form.setValues({
      companyName: settings.companyName,
      companyAddress: settings.companyAddress || '',
      companyEmail: settings.companyEmail || '',
      companyPhone: settings.companyPhone || '',
      invoiceFooterMarkdown: settings.invoiceFooterMarkdown || '',
      nextInvoiceNumber: settings.nextInvoiceNumber,
      timezone: settings.timezone || '',
    });
  }

  const apiKeys = apiKeyData?.keys || [];

  return (
    <Container size="md">
      <Title order={1} mb="xl">
        Settings
      </Title>

      <form onSubmit={handleSubmit}>
        <Stack gap="xl">
          <Tabs defaultValue="companyInfo">
            <Tabs.List>
              <Tabs.Tab value="companyInfo">Company Info</Tabs.Tab>
              <Tabs.Tab value="invoiceSettings">Invoice Settings</Tabs.Tab>
              <Tabs.Tab value="apiKeys">API Key</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="companyInfo" pt="md">
              <Card shadow="sm" padding="lg">
                <Title order={3} mb="md">
                  Company Information
                </Title>
                <Text size="sm" c="dimmed" mb="md">
                  This information will appear on your invoices
                </Text>
                <Stack>
                  <TextInput
                    label="Company Name"
                    placeholder="Your Company Name"
                    required
                    {...form.getInputProps('companyName')}
                  />
                  <Textarea
                    label="Company Address"
                    placeholder="123 Main St, City, Country"
                    rows={3}
                    {...form.getInputProps('companyAddress')}
                  />
                  <TextInput
                    label="Company Email"
                    placeholder="billing@company.com"
                    type="email"
                    {...form.getInputProps('companyEmail')}
                  />
                  <TextInput
                    label="Company Phone"
                    placeholder="+1 234 567 8900"
                    {...form.getInputProps('companyPhone')}
                  />
                  <Divider />
                  <TextInput
                    label="Timezone"
                    description="This timezone is configured on the server via the TZ environment variable and cannot be changed here."
                    placeholder="Pacific/Auckland"
                    readOnly
                    disabled
                    {...form.getInputProps('timezone')}
                  />
                </Stack>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="invoiceSettings" pt="md">
              <Card shadow="sm" padding="lg">
                <Title order={3} mb="md">
                  Invoice Settings
                </Title>
                <Stack>
                  <NumberInput
                    label="Next Invoice Number"
                    description="The next invoice will use this number and increment from here"
                    placeholder="1"
                    required
                    min={1}
                    {...form.getInputProps('nextInvoiceNumber')}
                  />

                  <div>
                    <Textarea
                      label="Invoice Footer (Markdown)"
                      description="Use markdown formatting and template variables. This will appear at the bottom of invoices."
                      placeholder="e.g., **Payment Terms:** Net 30 days. Please quote **{INVOICE_NO}** in all payments."
                      rows={6}
                      {...form.getInputProps('invoiceFooterMarkdown')}
                    />

                    <Alert
                      icon={<IconInfoCircle />}
                      title="Available Template Variables"
                      color="blue"
                      mt="md"
                    >
                      <Text size="sm" mb="xs">
                        You can use these variables in your invoice footer. They will be replaced with actual values when generating invoices:
                      </Text>
                      <List size="sm" spacing="xs">
                        <List.Item>
                          <Code>{'{INVOICE_NO}'}</Code> - Invoice number (e.g., INV-0123)
                        </List.Item>
                        <List.Item>
                          <Code>{'{INVOICE_DATE}'}</Code> - Invoice date (e.g., 15 Jan 2025)
                        </List.Item>
                        <List.Item>
                          <Code>{'{CLIENT_NAME}'}</Code> - Customer/client name
                        </List.Item>
                        <List.Item>
                          <Code>{'{TOTAL_AMOUNT}'}</Code> - Total invoice amount (e.g., NZD 1,500.00)
                        </List.Item>
                        <List.Item>
                          <Code>{'{DATE}'}</Code> - Current date when PDF is generated
                        </List.Item>
                        <List.Item>
                          <Code>{'{COMPANY_NAME}'}</Code> - Your company name
                        </List.Item>
                        <List.Item>
                          <Code>{'{COMPANY_ADDRESS}'}</Code> - Your company address
                        </List.Item>
                      </List>
                    </Alert>

                    {footerPreview && (
                      <Paper p="md" mt="md" withBorder>
                        <Text size="sm" fw={500} mb="xs">
                          Preview (with sample data):
                        </Text>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {footerPreview}
                        </Text>
                      </Paper>
                    )}
                  </div>
                </Stack>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="apiKeys" pt="md">
              <Card shadow="sm" padding="lg">
                <Title order={3} mb="md">
                  API Keys
                </Title>
                <Stack>
                  <Text size="sm" c="dimmed">
                    Manage API keys used by integration endpoints. Generating a new key revokes any currently active key.
                  </Text>
                  <Group>
                    <Button
                      leftSection={<IconKey size={16} />}
                      onClick={() => generateApiKeyMutation.mutate()}
                      loading={generateApiKeyMutation.isPending}
                    >
                      Generate API Key
                    </Button>
                    <Anchor component={Link} to="/settings/api-docs">
                      <Group gap={6}>
                        <IconBook size={16} />
                        <Text size="sm">View API endpoint docs</Text>
                      </Group>
                    </Anchor>
                  </Group>

                  {newApiKey && (
                    <Alert color="yellow" title="Store this key now">
                      <Text size="sm" mb="xs">
                        This is the only time the full API key is shown.
                      </Text>
                      <Code block>{newApiKey}</Code>
                      <Button mt="sm" variant="light" onClick={handleCopyApiKey}>
                        Copy API Key
                      </Button>
                    </Alert>
                  )}

                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Key</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Created</Table.Th>
                        <Table.Th>Last Used</Table.Th>
                        <Table.Th ta="right">Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {apiKeys.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={6}>
                            <Text size="sm" c="dimmed">No API keys found.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        apiKeys.map((apiKey) => (
                          <Table.Tr key={apiKey.id}>
                            <Table.Td>{apiKey.name}</Table.Td>
                            <Table.Td>
                              <Code>{apiKey.keyPrefix}...{apiKey.keyLastFour}</Code>
                            </Table.Td>
                            <Table.Td>
                              {apiKey.revokedAt ? (
                                <Badge color="gray">Revoked</Badge>
                              ) : (
                                <Badge color="green">Active</Badge>
                              )}
                            </Table.Td>
                            <Table.Td>{DateTime.fromISO(apiKey.createdAt).toFormat('dd LLL yyyy')}</Table.Td>
                            <Table.Td>
                              {apiKey.lastUsedAt
                                ? DateTime.fromISO(apiKey.lastUsedAt).toFormat('dd LLL yyyy HH:mm')
                                : '-'}
                            </Table.Td>
                            <Table.Td ta="right">
                              {!apiKey.revokedAt && (
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => handleOpenDeleteModal(apiKey)}
                                  aria-label="Delete API key"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Card>
            </Tabs.Panel>
          </Tabs>

          <Divider />

          <Group justify="flex-end">
            <Button
              type="submit"
              leftSection={<IconDeviceFloppy size={16} />}
              loading={updateMutation.isPending}
              size="lg"
            >
              Save Settings
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete API Key"
      >
        <Text mb="md">
          Are you sure you want to delete API key{' '}
          <Code>{deletingApiKey?.keyPrefix}...{deletingApiKey?.keyLastFour}</Code>?
          This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteApiKey} loading={deleteApiKeyMutation.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
