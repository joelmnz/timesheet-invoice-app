import { Group, Title } from '@mantine/core';
import { ReactNode } from 'react';

interface ListHeaderProps {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function ListHeader({ title, action, children }: ListHeaderProps) {
  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={1}>{title}</Title>
        {action}
      </Group>
      {children}
    </>
  );
}
