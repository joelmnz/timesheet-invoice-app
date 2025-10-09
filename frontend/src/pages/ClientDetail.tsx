import { useParams, useNavigate } from 'react-router-dom';
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
  Anchor
} from '@mantine/core';
import { Link } from 'react-router-dom';
import {
  IconArrowLeft,
  IconDownload,
  IconEdit,
  IconEye,
} from '@tabler/icons-react';
import { clientsApi, projectsApi, invoicesApi } from '../services/api';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const clientId = parseInt(id || '0');

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['clients', clientId],
    queryFn: () => clientsApi.get(clientId),
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { clientId }],
    queryFn: () => projectsApi.listByClient(clientId, 'all'),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', { clientId }],
    queryFn: () => invoicesApi.list({ clientId }),
  });

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
          <Button
            variant="light"
            leftSection={<IconEdit size={16} />}
            onClick={() => navigate('/clients')}
          >
            Edit Client
          </Button>
        </Group>

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
                      onClick={() => invoicesApi.downloadPdf(invoice.id, invoice.number)}
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
    </Container>
  );
}
