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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle } from '@tabler/icons-react';
import { settingsApi } from '../services/api';
import { DateTime } from 'luxon';
import { useMemo } from 'react';

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
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

  const handleSubmit = form.onSubmit((values) => {
    updateMutation.mutate(values);
  });

  // Generate preview of footer with sample data
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
      // Simple string replacement for preview only - not used in actual PDF generation
      // The backend uses proper template replacement with server-side validation
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

  return (
    <Container size="md">
      <Title order={1} mb="xl">
        Settings
      </Title>

      <form onSubmit={handleSubmit}>
        <Stack gap="xl">
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
            </Stack>
          </Card>

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
                  <Text size="sm" mt="xs" fw={500}>
                    Example:
                  </Text>
                  <Code block mt="xs">
                    {`**Payment Terms:** Net 30 days

Please quote invoice number **{INVOICE_NO}** in all payments.`}
                  </Code>
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

          <Card shadow="sm" padding="lg">
            <Title order={3} mb="md">
              Regional Settings
            </Title>
            <Stack>
              <TextInput
                label="Timezone"
                description="e.g., Pacific/Auckland, America/New_York"
                placeholder="Pacific/Auckland"
                {...form.getInputProps('timezone')}
              />
            </Stack>
          </Card>

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
    </Container>
  );
}
