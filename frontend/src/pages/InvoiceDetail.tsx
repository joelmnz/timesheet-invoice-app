import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  Modal,
  Stack,
  Loader,
  Center,
  Text,
  ActionIcon,
  NumberInput,
  Textarea,
  Card,
  Badge,
  Select,
  Divider,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconArrowLeft,
  IconDownload,
  IconCheck,
} from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { invoicesApi } from '../services/api';
import type { Invoice, InvoiceLineItem } from '../types';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(id || '0');

  const [lineModalOpened, { open: openLineModal, close: closeLineModal }] =
    useDisclosure(false);
  const [deleteLineModalOpened, { open: openDeleteLineModal, close: closeDeleteLineModal }] =
    useDisclosure(false);
  const [invoiceModalOpened, { open: openInvoiceModal, close: closeInvoiceModal }] =
    useDisclosure(false);
  const [markPaidModalOpened, { open: openMarkPaidModal, close: closeMarkPaidModal }] =
    useDisclosure(false);

  const [editingLine, setEditingLine] = useState<InvoiceLineItem | null>(null);
  const [deletingLine, setDeletingLine] = useState<InvoiceLineItem | null>(null);

  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
  });

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['invoice-lines', invoiceId],
    queryFn: () => invoicesApi.getLines(invoiceId),
  });

  const invoiceForm = useForm({
    initialValues: {
      dateInvoiced: new Date(),
      dueDate: new Date(),
      status: 'Draft' as 'Draft' | 'Sent' | 'Paid' | 'Cancelled',
      dateSent: null as Date | null,
      datePaid: null as Date | null,
      notes: '',
    },
  });

  const lineForm = useForm({
    initialValues: {
      type: 'manual' as 'time' | 'expense' | 'manual',
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
    validate: {
      description: (value) => (!value ? 'Description is required' : null),
      quantity: (value) => (value <= 0 ? 'Quantity must be greater than 0' : null),
      // Allow negative unit prices to support discounts/credits; disallow zero
      unitPrice: (value) => (value === 0 ? 'Unit price cannot be 0' : null),
    },
  });

  const markPaidForm = useForm({
    initialValues: {
      datePaid: new Date(),
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Invoice> }) =>
      invoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      notifications.show({
        title: 'Success',
        message: 'Invoice updated successfully',
        color: 'green',
      });
      closeInvoiceModal();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const addLineMutation = useMutation({
    mutationFn: (data: Partial<InvoiceLineItem>) =>
      invoicesApi.addLine(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-lines', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      notifications.show({
        title: 'Success',
        message: 'Line item added successfully',
        color: 'green',
      });
      closeLineModal();
      lineForm.reset();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InvoiceLineItem> }) =>
      invoicesApi.updateLine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-lines', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      notifications.show({
        title: 'Success',
        message: 'Line item updated successfully',
        color: 'green',
      });
      closeLineModal();
      lineForm.reset();
      setEditingLine(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: invoicesApi.deleteLine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-lines', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      notifications.show({
        title: 'Success',
        message: 'Line item deleted successfully',
        color: 'green',
      });
      closeDeleteLineModal();
      setDeletingLine(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleOpenInvoiceModal = () => {
    if (invoice) {
      // Helper function to safely parse date strings, falling back to current date if invalid
      const parseDateSafely = (dateStr: string): Date => {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      };

      invoiceForm.setValues({
        dateInvoiced: parseDateSafely(invoice.dateInvoiced),
        dueDate: parseDateSafely(invoice.dueDate),
        status: invoice.status,
        dateSent: invoice.dateSent ? parseDateSafely(invoice.dateSent) : null,
        datePaid: invoice.datePaid ? parseDateSafely(invoice.datePaid) : null,
        notes: invoice.notes || '',
      });
      openInvoiceModal();
    }
  };

  const handleSubmitInvoice = invoiceForm.onSubmit((values) => {
    const data: Partial<Invoice> = {
      dateInvoiced: DateTime.fromJSDate(values.dateInvoiced).toISODate() || '',
      dueDate: DateTime.fromJSDate(values.dueDate).toISODate() || '',
      status: values.status,
      dateSent: values.dateSent
        ? DateTime.fromJSDate(values.dateSent).toISODate() || undefined
        : null,
      datePaid: values.datePaid
        ? DateTime.fromJSDate(values.datePaid).toISODate() || undefined
        : null,
      notes: values.notes || undefined,
    };
    updateInvoiceMutation.mutate({ id: invoiceId, data });
  });

  const handleOpenCreateLineModal = () => {
    setEditingLine(null);
    lineForm.reset();
    openLineModal();
  };

  const handleOpenEditLineModal = (line: InvoiceLineItem) => {
    setEditingLine(line);
    lineForm.setValues({
      type: line.type,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    });
    openLineModal();
  };

  const handleOpenDeleteLineModal = (line: InvoiceLineItem) => {
    setDeletingLine(line);
    openDeleteLineModal();
  };

  const handleSubmitLine = lineForm.onSubmit((values) => {
    const data = {
      type: values.type,
      description: values.description,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      amount: values.quantity * values.unitPrice,
    };

    if (editingLine) {
      updateLineMutation.mutate({ id: editingLine.id, data });
    } else {
      addLineMutation.mutate(data);
    }
  });

  const handleDeleteLine = () => {
    if (deletingLine) {
      deleteLineMutation.mutate(deletingLine.id);
    }
  };

  const handleMarkAsSent = () => {
    const data: Partial<Invoice> = {
      status: 'Sent',
      dateSent: DateTime.now().toISODate() || undefined,
    };
    updateInvoiceMutation.mutate({ id: invoiceId, data });
  };

  const handleMarkAsPaid = () => {
    markPaidForm.setValues({
      datePaid: new Date(),
    });
    openMarkPaidModal();
  };

  const handleCancelInvoice = () => {
    const data: Partial<Invoice> = {
      status: 'Cancelled',
    };
    updateInvoiceMutation.mutate({ id: invoiceId, data });
  };

  const handleSubmitMarkPaid = markPaidForm.onSubmit((values) => {
    const data: Partial<Invoice> = {
      status: 'Paid',
      datePaid: DateTime.fromJSDate(values.datePaid).toISODate() || undefined,
    };
    updateInvoiceMutation.mutate({ id: invoiceId, data });
    closeMarkPaidModal();
  });

  if (invoiceLoading || linesLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!invoice) {
    return (
      <Container size="xl">
        <Text c="red">Invoice not found</Text>
      </Container>
    );
  }

  const subtotal = lines?.reduce((sum, line) => sum + line.amount, 0) || 0;

  return (
    <Container size="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/invoices')}
        mb="md"
      >
        Back to Invoices
      </Button>

      <Card shadow="sm" padding="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={1}>Invoice {invoice.number}</Title>
            <Text size="lg" c="dimmed" mt="xs">
              {invoice.client?.name} • {invoice.project?.name}
            </Text>
          </div>
          <Group>
            <Badge 
              color={
                invoice.status === 'Draft' ? 'gray' :
                invoice.status === 'Sent' ? 'orange' :
                invoice.status === 'Paid' ? 'green' :
                'red'
              } 
              size="lg"
            >
              {invoice.status}
            </Badge>
          </Group>
        </Group>

        <Divider my="md" />

        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">Invoice Date</Text>
            <Text size="md">{invoice.dateInvoiced}</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Due Date</Text>
            <Text size="md">{invoice.dueDate}</Text>
          </div>
          {invoice.dateSent && (
            <div>
              <Text size="sm" c="dimmed">Date Sent</Text>
              <Text size="md">{invoice.dateSent}</Text>
            </div>
          )}
          {invoice.datePaid && (
            <div>
              <Text size="sm" c="dimmed">Date Paid</Text>
              <Text size="md">{invoice.datePaid}</Text>
            </div>
          )}
        </Group>

        {invoice.notes && (
          <>
            <Divider my="md" />
            <div>
              <Text size="sm" c="dimmed" mb="xs">Notes</Text>
              <Text>{invoice.notes}</Text>
            </div>
          </>
        )}

        <Divider my="md" />

        <Group justify="flex-end">
          <Button variant="light" onClick={handleOpenInvoiceModal}>
            <IconEdit size={16} style={{ marginRight: 8 }} />
            Edit Invoice
          </Button>
          {invoice.status === 'Draft' && (
            <Button
              color="orange"
              onClick={handleMarkAsSent}
              loading={updateInvoiceMutation.isPending}
            >
              Mark as Sent
            </Button>
          )}
          {(invoice.status === 'Draft' || invoice.status === 'Sent') && (
            <Button
              color="green"
              onClick={handleMarkAsPaid}
              loading={updateInvoiceMutation.isPending}
            >
              <IconCheck size={16} style={{ marginRight: 8 }} />
              Mark as Paid
            </Button>
          )}
          {(invoice.status === 'Draft' || invoice.status === 'Sent') && (
            <Button
              color="red"
              variant="light"
              onClick={handleCancelInvoice}
              loading={updateInvoiceMutation.isPending}
            >
              Cancel Invoice
            </Button>
          )}
          <Button
            variant="light"
            onClick={async () => {
              try {
                await invoicesApi.downloadPdf(invoice.id, invoice.number, invoice.client?.name || 'Unknown');
              } catch (error) {
                notifications.show({
                  title: 'Error',
                  message: error instanceof Error ? error.message : 'Failed to download PDF',
                  color: 'red',
                });
              }
            }}
          >
            <IconDownload size={16} style={{ marginRight: 8 }} />
            Download PDF
          </Button>
        </Group>
      </Card>

      <Card shadow="sm" padding="lg">
        <Group justify="space-between" mb="md">
          <Title order={3}>Line Items</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={handleOpenCreateLineModal}
            disabled={invoice.status !== 'Draft'}
          >
            Add Line Item
          </Button>
        </Group>

        {!lines || lines.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            No line items yet. Add your first line item!
          </Text>
        ) : (
          <>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Description</Table.Th>
                  <Table.Th ta="center">Type</Table.Th>
                  <Table.Th ta="right">Quantity</Table.Th>
                  <Table.Th ta="right">Unit Price</Table.Th>
                  <Table.Th ta="right">Amount</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {lines.map((line) => (
                  <Table.Tr key={line.id}>
                    <Table.Td>{line.description}</Table.Td>
                    <Table.Td ta="center">
                      <Badge>{line.type}</Badge>
                    </Table.Td>
                    <Table.Td ta="right">{line.quantity.toFixed(2)}</Table.Td>
                    <Table.Td ta="right">NZD {line.unitPrice.toFixed(2)}</Table.Td>
                    <Table.Td ta="right">NZD {line.amount.toFixed(2)}</Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenEditLineModal(line)}
                          disabled={invoice.status !== 'Draft'}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleOpenDeleteLineModal(line)}
                          disabled={invoice.status !== 'Draft'}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Divider my="md" />

            <Group justify="flex-end">
              <div style={{ textAlign: 'right' }}>
                <Text size="sm" c="dimmed">Subtotal</Text>
                <Text size="xl" fw={700}>NZD {subtotal.toFixed(2)}</Text>
              </div>
            </Group>
          </>
        )}
      </Card>

      <Modal
        opened={invoiceModalOpened}
        onClose={closeInvoiceModal}
        title="Edit Invoice"
        size="lg"
      >
        <form onSubmit={handleSubmitInvoice}>
          <Stack>
            <DatePickerInput
              label="Invoice Date"
              required
              {...invoiceForm.getInputProps('dateInvoiced')}
            />
            <DatePickerInput
              label="Due Date"
              required
              {...invoiceForm.getInputProps('dueDate')}
            />
            <Select
              label="Status"
              data={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              required
              {...invoiceForm.getInputProps('status')}
            />
            {invoiceForm.values.status === 'Sent' && (
              <DatePickerInput
                label="Date Sent"
                clearable
                {...invoiceForm.getInputProps('dateSent')}
              />
            )}
            {invoiceForm.values.status === 'Paid' && (
              <DatePickerInput
                label="Date Paid"
                clearable
                {...invoiceForm.getInputProps('datePaid')}
              />
            )}
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...invoiceForm.getInputProps('notes')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeInvoiceModal}>
                Cancel
              </Button>
              <Button type="submit" loading={updateInvoiceMutation.isPending}>
                Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={lineModalOpened}
        onClose={closeLineModal}
        title={editingLine ? 'Edit Line Item' : 'Add Line Item'}
        size="lg"
      >
        <form onSubmit={handleSubmitLine}>
          <Stack>
            <Select
              label="Type"
              data={[
                { value: 'manual', label: 'Manual' },
                { value: 'time', label: 'Time' },
                { value: 'expense', label: 'Expense' },
              ]}
              required
              disabled={!!editingLine}
              {...lineForm.getInputProps('type')}
            />
            <Textarea
              label="Description"
              placeholder="Line item description"
              required
              {...lineForm.getInputProps('description')}
            />
            <NumberInput
              label={lineForm.values.type === 'time' ? 'Hours' : 'Quantity'}
              placeholder="1.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...lineForm.getInputProps('quantity')}
            />
            <NumberInput
              label={lineForm.values.type === 'time' ? 'Hourly Rate (NZD)' : 'Unit Price (NZD)'}
              placeholder="0.00"
              required
              decimalScale={2}
              fixedDecimalScale
              {...lineForm.getInputProps('unitPrice')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeLineModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={addLineMutation.isPending || updateLineMutation.isPending}
              >
                {editingLine ? 'Update' : 'Add'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteLineModalOpened}
        onClose={closeDeleteLineModal}
        title="Delete Line Item"
      >
        <Text mb="md">
          Are you sure you want to delete this line item? This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteLineModal}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDeleteLine}
            loading={deleteLineMutation.isPending}
          >
            Delete
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={markPaidModalOpened}
        onClose={closeMarkPaidModal}
        title="Mark Invoice as Paid"
      >
        <form onSubmit={handleSubmitMarkPaid}>
          <Stack>
            <Text size="sm" c="dimmed">
              Set the date payment was received:
            </Text>
            <DatePickerInput
              label="Payment Date"
              required
              {...markPaidForm.getInputProps('datePaid')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeMarkPaidModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="green"
                loading={updateInvoiceMutation.isPending}
              >
                Mark as Paid
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
