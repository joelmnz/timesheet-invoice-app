import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  Button,
  Badge,
  Text,
  ActionIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconDashboard,
  IconUsers,
  IconFolders,
  IconFileInvoice,
  IconReportAnalytics,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
  IconPlayerStop,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useTimer } from '../contexts/TimerContext';
import { DateTime } from 'luxon';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { currentTimer, stopTimer } = useTimer();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const navItems = [
    { label: 'Dashboard', icon: IconDashboard, path: '/' },
    { label: 'Clients', icon: IconUsers, path: '/clients' },
    { label: 'Projects', icon: IconFolders, path: '/projects' },
    { label: 'Invoices', icon: IconFileInvoice, path: '/invoices' },
    { label: 'Reports', icon: IconReportAnalytics, path: '/reports' },
    { label: 'Settings', icon: IconSettings, path: '/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStopTimer = async () => {
    if (currentTimer && currentTimer.project) {
      await stopTimer(currentTimer.projectId);
    }
  };

  const formatDuration = (startAt: string) => {
    const start = DateTime.fromISO(startAt);
    const now = DateTime.now();
    const duration = now.diff(start, ['hours', 'minutes', 'seconds']);
    return `${Math.floor(duration.hours)}h ${Math.floor(duration.minutes % 60)}m`;
  };

  useEffect(() => {
    if (currentTimer) {
      setTimerDisplay(formatDuration(currentTimer.startAt));
      const interval = setInterval(() => {
        setTimerDisplay(formatDuration(currentTimer.startAt));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentTimer]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={() => setOpened(!opened)} hiddenFrom="sm" size="sm" />
            <Title order={3}>Timesheet & Invoice</Title>
          </Group>

          <Group>
            {currentTimer && (
              <Group gap="xs">
                <Badge size="lg" variant="filled" color="red">
                  <Text size="sm" fw={600}>
                    {currentTimer.project?.name || 'Unknown'} • {timerDisplay}
                  </Text>
                </Badge>
                <Button
                  size="sm"
                  variant="light"
                  color="red"
                  onClick={handleStopTimer}
                  leftSection={<IconPlayerStop size={16} />}
                >
                  Stop
                </Button>
              </Group>
            )}

            <ActionIcon
              variant="default"
              onClick={() => toggleColorScheme()}
              size="lg"
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={20} />}
            active={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setOpened(false);
            }}
            mb="xs"
          />
        ))}

        <NavLink
          label="Logout"
          leftSection={<IconLogout size={20} />}
          onClick={handleLogout}
          mt="auto"
          color="red"
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
