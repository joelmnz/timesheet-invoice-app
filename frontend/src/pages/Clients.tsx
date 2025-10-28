import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Button,
  Group,
  TextInput,
  Modal,
  Stack,
  Text,
  NumberInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { clientsApi } from '../services/api';
import type { Client } from '../types';
import { ListHeader } from '../components/lists/ListHeader';
import { ClientList } from '../components/lists/ClientList';

export default function Clients() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: clientsResponse, isLoading } = useQuery({
    queryKey: ['clients', searchQuery, page, pageSize],
    queryFn: () => clientsApi.list(searchQuery || undefined, page, pageSize),
  });

  const clients = clientsResponse?.data || [];

  useEffect(() => {
    if (location.state?.editClientId && clients) {
      const clientToEdit = clients.find(c => c.id === location.state.editClientId);
      if (clientToEdit) {
        handleOpenEditModal(clientToEdit);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, clients]);

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
        defaultHourlyRate: (value) => (value < 0 ? 'Hourly rate cannot be negative' : null),
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

  return (
    <Container size="xl">
      <ListHeader
        title="Clients"
        action={
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal} data-testid="create-client-btn">
            New Client
          </Button>
        }
      >
        <TextInput
          placeholder="Search clients..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          mb="md"
        />
      </ListHeader>

      <ClientList
        clients={clients || []}
        loading={isLoading}
        emptyState={searchQuery ? 'No clients found' : 'No clients yet. Create your first client!'}
        pagination={clientsResponse?.pagination}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onClick={(id) => navigate(`/clients/${id}`)}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

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
              data-testid="client-name-input"
            />
            <TextInput
              label="Contact Person"
              placeholder="Contact person name"
              {...form.getInputProps('contactPerson')}
              data-testid="client-contact-input"
            />
            <TextInput
              label="Email"
              placeholder="client@example.com"
              type="email"
              {...form.getInputProps('email')}
              data-testid="client-email-input"
            />
            <Textarea
              label="Address"
              placeholder="Client address"
              {...form.getInputProps('address')}
              data-testid="client-address-input"
            />
            <NumberInput
              label="Default Hourly Rate (NZD)"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              {...form.getInputProps('defaultHourlyRate')}
              data-testid="client-rate-input"
            />
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...form.getInputProps('notes')}
              data-testid="client-notes-input"
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
                data-testid="client-submit-btn"
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
