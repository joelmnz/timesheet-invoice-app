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
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { settingsApi } from '../services/api';

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
              <Textarea
                label="Invoice Footer (Markdown)"
                description="Use markdown formatting. This will appear at the bottom of invoices."
                placeholder="e.g., **Payment Terms:** Net 30 days..."
                rows={5}
                {...form.getInputProps('invoiceFooterMarkdown')}
              />
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
