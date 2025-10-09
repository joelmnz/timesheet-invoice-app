import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  TextInput,
  Modal,
  Stack,
  Loader,
  Center,
  Text,
  ActionIcon,
  NumberInput,
  Textarea,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import { clientsApi } from '../services/api';
import type { Client } from '../types';

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', searchQuery],
    queryFn: () => clientsApi.list(searchQuery || undefined),
  });

  const form = useForm({
    initialValues: {
      name: '',
      address: '',
      email: '',
      contactPerson: '',
      defaultHourlyRate: 0,
      notes: '',
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      defaultHourlyRate: (value) => (value <= 0 ? 'Hourly rate must be greater than 0' : null),
    },
  });

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      notifications.show({
        title: 'Success',
        message: 'Client created successfully',
        color: 'green',
      });
      closeModal();
      form.reset();
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      notifications.show({
        title: 'Success',
        message: 'Client updated successfully',
        color: 'green',
      });
      closeModal();
      form.reset();
      setEditingClient(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      notifications.show({
        title: 'Success',
        message: 'Client deleted successfully',
        color: 'green',
      });
      closeDeleteModal();
      setDeletingClient(null);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    form.reset();
    openModal();
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    form.setValues({
      name: client.name,
      address: client.address || '',
      email: client.email || '',
      contactPerson: client.contactPerson || '',
      defaultHourlyRate: client.defaultHourlyRate,
      notes: client.notes || '',
    });
    openModal();
  };

  const handleOpenDeleteModal = (client: Client) => {
    setDeletingClient(client);
    openDeleteModal();
  };

  const handleSubmit = form.onSubmit((values) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  });

  const handleDelete = () => {
    if (deletingClient) {
      deleteMutation.mutate(deletingClient.id);
    }
  };

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Clients</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
          New Client
        </Button>
      </Group>

      <TextInput
        placeholder="Search clients..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        mb="md"
      />

      {!clients || clients.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          {searchQuery ? 'No clients found' : 'No clients yet. Create your first client!'}
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Contact Person</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th ta="right">Default Rate</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {clients.map((client) => (
              <Table.Tr key={client.id}>
                <Table.Td>
                  <Anchor
                    component="button"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    {client.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>{client.contactPerson || '-'}</Table.Td>
                <Table.Td>{client.email || '-'}</Table.Td>
                <Table.Td ta="right">NZD {client.defaultHourlyRate.toFixed(2)}/hr</Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => handleOpenEditModal(client)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleOpenDeleteModal(client)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingClient ? 'Edit Client' : 'Create Client'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Client name"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Contact Person"
              placeholder="Contact person name"
              {...form.getInputProps('contactPerson')}
            />
            <TextInput
              label="Email"
              placeholder="client@example.com"
              type="email"
              {...form.getInputProps('email')}
            />
            <Textarea
              label="Address"
              placeholder="Client address"
              {...form.getInputProps('address')}
            />
            <NumberInput
              label="Default Hourly Rate (NZD)"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...form.getInputProps('defaultHourlyRate')}
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...form.getInputProps('notes')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingClient ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Delete Client"
      >
        <Text mb="md">
          Are you sure you want to delete <strong>{deletingClient?.name}</strong>?
          This action cannot be undone.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleteMutation.isPending}>
            Delete
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
