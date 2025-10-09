import { Badge } from '@mantine/core';

interface StatusBadgeProps {
  type: 'project' | 'invoice';
  active?: boolean;
  status?: 'Paid' | 'Unpaid';
}

export function StatusBadge({ type, active, status }: StatusBadgeProps) {
  if (type === 'project') {
    return (
      <Badge color={active ? 'green' : 'gray'}>
        {active ? 'Active' : 'Inactive'}
      </Badge>
    );
  }

  if (type === 'invoice' && status) {
    return (
      <Badge color={status === 'Paid' ? 'green' : 'orange'}>
        {status}
      </Badge>
    );
  }

  return null;
}
