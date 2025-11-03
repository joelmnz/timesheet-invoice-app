import { Badge } from '@mantine/core';

interface StatusBadgeProps {
  type: 'project' | 'invoice';
  active?: boolean;
  status?: 'Draft' | 'Sent' | 'Paid' | 'Cancelled';
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
    const colorMap = {
      Draft: 'gray',
      Sent: 'orange',
      Paid: 'green',
      Cancelled: 'red',
    };
    return (
      <Badge color={colorMap[status]}>
        {status}
      </Badge>
    );
  }

  return null;
}
