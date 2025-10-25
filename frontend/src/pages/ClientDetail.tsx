import { useParams, useNavigate } from 'react-router-dom';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Title,
  Button,
  Table,
  Group,
  Loader,
  Center,
  Text,
  Card,
  Badge,
  ActionIcon,
  Anchor,
  Modal,
  TextInput,
  NumberInput,
  Switch,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Link } from 'react-router-dom';
import {
  IconArrowLeft,
  IconDownload,
  IconEdit,
  IconEye,
} from '@tabler/icons-react';
import { clientsApi, projectsApi, invoicesApi } from '../services/api';
import { Pagination } from '../components/common/Pagination';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = parseInt(id || '0');

  // State for Add Project modal
  const [addProjectOpen, setAddProjectOpen] = React.useState(false);
  const [projectName, setProjectName] = React.useState('');
  const [hourlyRate, setHourlyRate] = React.useState<number>(0);
  const [active, setActive] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pagination state for invoices
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // Query for client
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => clientsApi.get(clientId),
  });

  React.useEffect(() => {
    if (addProjectOpen && client) {
      setHourlyRate(client.defaultHourlyRate || 0);
    }
  }, [addProjectOpen, client]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { clientId }],
    queryFn: () => projectsApi.listByClient(clientId, 'all'),
  });

  const { data: invoicesResponse, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', { clientId, page, pageSize }],
    queryFn: () => invoicesApi.list({ clientId, page, pageSize }),
  });

  const invoices = invoicesResponse?.data || [];

  if (clientLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!client) {
    return (
      <Container size="xl">
        <Text c="red">Client not found</Text>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/clients')}
        mb="md"
      >
        Back to Clients
      </Button>

      <Card shadow="sm" padding="lg" mb="xl">
        <Group justify="space-between" mb="md">
          <Title order={1}>{client.name}</Title>
          <Group>
            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={() => navigate('/clients', { state: { editClientId: clientId } })}
            >
              Edit Client
            </Button>
            <Button
              variant="filled"
              color="green"
              leftSection={<IconEdit size={16} />} // You may want to use a different icon
              onClick={() => setAddProjectOpen(true)}
            >
              Add Project
            </Button>
          </Group>
        </Group>
      <Modal
        opened={addProjectOpen}
        onClose={() => setAddProjectOpen(false)}
        title="Add New Project"
        centered
      >
        <Stack>
          <TextInput
            label="Project Name"
            placeholder="Enter project name"
            value={projectName}
            onChange={e => setProjectName(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Hourly Rate (NZD)"
            value={hourlyRate}
            onChange={val => setHourlyRate(Number(val))}
            min={0}
            required
          />
          <Switch
            label="Active"
            checked={active}
            onChange={e => setActive(e.currentTarget.checked)}
          />
          {error && <Text c="red" size="sm">{error}</Text>}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAddProjectOpen(false)} disabled={creating}>Cancel</Button>
            <Button
              variant="filled"
              color="green"
              loading={creating}
              onClick={async () => {
                setCreating(true);
                setError(null);
                try {
                  // Call API to create project
                  await projectsApi.create({
                    clientId,
                    name: projectName,
                    hourlyRate,
                    active,
                  });
                  setAddProjectOpen(false);
                  setProjectName('');
                  setHourlyRate(client?.defaultHourlyRate || 0);
                  setActive(true);
                  // Optionally, refetch projects list
                  if (typeof window !== 'undefined' && window.location) {
                    window.location.reload(); // simple way to refresh
                  }
                } catch (err: any) {
                  setError(err?.message || 'Failed to create project');
                } finally {
                  setCreating(false);
                }
              }}
              disabled={!projectName || hourlyRate <= 0}
            >
              Create Project
            </Button>
          </Group>
        </Stack>
      </Modal>

        <Group gap="xl">
          {client.contactPerson && (
            <div>
              <Text size="sm" c="dimmed">Contact Person</Text>
              <Text>{client.contactPerson}</Text>
            </div>
          )}
          {client.email && (
            <div>
              <Text size="sm" c="dimmed">Email</Text>
              <Text>{client.email}</Text>
            </div>
          )}
          <div>
            <Text size="sm" c="dimmed">Default Rate</Text>
            <Text>NZD {client.defaultHourlyRate.toFixed(2)}/hr</Text>
          </div>
        </Group>

        {client.address && (
          <div style={{ marginTop: '1rem' }}>
            <Text size="sm" c="dimmed">Address</Text>
            <Text>{client.address}</Text>
          </div>
        )}

        {client.notes && (
          <div style={{ marginTop: '1rem' }}>
            <Text size="sm" c="dimmed">Notes</Text>
            <Text>{client.notes}</Text>
          </div>
        )}
      </Card>

      <Title order={2} mb="md">Projects</Title>
      {projectsLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : !projects || projects.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl" mb="xl">
          No projects found for this client.
        </Text>
      ) : (
        <Table striped highlightOnHover mb="xl">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Project Name</Table.Th>
              <Table.Th ta="right">Hourly Rate</Table.Th>
              <Table.Th ta="center">Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {projects.map((project) => (
              <Table.Tr key={project.id}>
                <Table.Td>
  <Anchor component={Link} to={`/projects/${project.id}`} fw={600}>
    {project.name}
  </Anchor>
</Table.Td>
                <Table.Td ta="right">NZD {project.hourlyRate.toFixed(2)}/hr</Table.Td>
                <Table.Td ta="center">
                  <Badge color={project.active ? 'green' : 'gray'}>
                    {project.active ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group justify="flex-end">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Title order={2} mb="md">Invoices</Title>
      {invoicesLoading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : !invoices || invoices.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl" mb="xl">
          No invoices found for this client.
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice #</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Due Date</Table.Th>
              <Table.Th ta="right">Total</Table.Th>
              <Table.Th ta="center">Status</Table.Th>
              <Table.Th ta="right">Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {invoices.map((invoice) => (
              <Table.Tr key={invoice.id}>
                <Table.Td>
  <Anchor component={Link} to={`/invoices/${invoice.id}`} fw={600}>
    {invoice.number}
  </Anchor>
</Table.Td>
                <Table.Td>{invoice.dateInvoiced}</Table.Td>
                <Table.Td>{invoice.dueDate}</Table.Td>
                <Table.Td ta="right">NZD {invoice.total.toFixed(2)}</Table.Td>
                <Table.Td ta="center">
                  <Badge color={invoice.status === 'Paid' ? 'green' : 'orange'}>
                    {invoice.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="gray"
                      onClick={async () => {
                        try {
                          await invoicesApi.downloadPdf(invoice.id, invoice.number);
                        } catch (error) {
                          notifications.show({
                            title: 'Error',
                            message: error instanceof Error ? error.message : 'Failed to download PDF',
                            color: 'red',
                          });
                        }
                      }}
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {invoicesResponse && (
        <Pagination
          pagination={invoicesResponse.pagination}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </Container>
  );
}
