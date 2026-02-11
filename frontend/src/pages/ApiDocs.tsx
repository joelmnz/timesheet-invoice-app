import { Button, Card, Code, Container, Group, List, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy } from '@tabler/icons-react';

const apiDocsMarkdown = `# Timesheet Invoice App - Integration API\n\nBase URL: \`/api/integration\`\nAuthentication: Include generated API key via \`x-api-key\` header (preferred) or \`Authorization: Bearer <API_KEY>\`.\n\n## Endpoints\n\n### GET /api/integration/fetchOutstandingInvoices\nReturns invoices with status \`Sent\` from Dashboard Outstanding Invoices.\n\nResponse shape:\n\n\`\`\`json
{
  "data": [
    {
      "id": 1,
      "number": "INV-1001",
      "dateInvoiced": "2026-01-10",
      "dueDate": "2026-02-10",
      "clientName": "Acme Ltd",
      "total": 1200,
      "daysOverdue": 0
    }
  ],
  "count": 1
}
\`\`\`\n\n### GET /api/integration/fetchUninvoicedItems\nReturns uninvoiced hours and billable expenses from Dashboard cards.\n\nResponse shape:\n\n\`\`\`json
{
  "hours": [
    {
      "projectId": 1,
      "projectName": "Website",
      "clientId": 2,
      "clientName": "Acme Ltd",
      "totalHours": 12.5,
      "hourlyRate": 120,
      "totalAmount": 1500
    }
  ],
  "expenses": [
    {
      "projectId": 1,
      "projectName": "Website",
      "clientId": 2,
      "clientName": "Acme Ltd",
      "totalAmount": 230
    }
  ],
  "totals": {
    "totalHours": 12.5,
    "totalHoursAmount": 1500,
    "totalExpensesAmount": 230
  }
}
\`\`\`\n\n## Example cURL\n\`\`\`bash
curl -H "x-api-key: YOUR_API_KEY" \\
  http://localhost:8080/api/integration/fetchOutstandingInvoices
\`\`\`
`;

export default function ApiDocs() {
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(apiDocsMarkdown);
      notifications.show({
        title: 'Copied',
        message: 'API docs markdown copied to clipboard',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Copy failed',
        message: 'Unable to copy markdown from this browser',
        color: 'red',
      });
    }
  };

  return (
    <Container size="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={1}>Integration API Docs</Title>
          <Button leftSection={<IconCopy size={16} />} onClick={handleCopyMarkdown}>
            Copy Markdown
          </Button>
        </Group>

        <Card shadow="sm" padding="lg">
          <Stack gap="md">
            <Text>
              These endpoints are authenticated with your generated API key and provide the same data as the
              dashboard widgets.
            </Text>
            <List>
              <List.Item>
                <Code>GET /api/integration/fetchOutstandingInvoices</Code>
              </List.Item>
              <List.Item>
                <Code>GET /api/integration/fetchUninvoicedItems</Code>
              </List.Item>
            </List>
            <Text size="sm" c="dimmed">
              Send your API key using <Code>x-api-key</Code> header, or Bearer token format in Authorization.
            </Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg">
          <Text fw={600} mb="xs">
            Markdown Source
          </Text>
          <Code block>{apiDocsMarkdown}</Code>
        </Card>
      </Stack>
    </Container>
  );
}
