import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Alert,
  Group,
  Progress,
  Code,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconDatabase,
  IconX,
} from '@tabler/icons-react';
import { migrationsApi } from '../services/api';

interface MigrationModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function MigrationModal({
  opened,
  onClose,
  onComplete,
}: MigrationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [step, setStep] = useState<'confirm' | 'running' | 'complete'>('confirm');

  const handleRunMigration = async () => {
    setLoading(true);
    setError(null);
    setStep('running');

    try {
      const result = await migrationsApi.runMigrations();

      if (result.success) {
        setBackupPath(result.backupPath || null);
        setStep('complete');
        setTimeout(() => {
          onComplete();
          onClose();
        }, 3000);
      } else {
        setError(result.error || 'Migration failed');
        setStep('confirm');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run migrations');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Database Migration Required"
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={!loading}
    >
      <Stack>
        {step === 'confirm' && (
          <>
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="Migration Needed"
              color="yellow"
            >
              Your database needs to be migrated to the latest schema. This is
              required to use the application.
            </Alert>

            <Text size="sm">
              <strong>What will happen:</strong>
            </Text>
            <Text size="sm" component="ul" pl="md">
              <li>A backup of your current database will be created</li>
              <li>Database tables will be created or updated</li>
              <li>Initial settings will be configured</li>
            </Text>

            <Text size="sm" c="dimmed">
              The migration usually takes a few seconds. Your data will be preserved.
            </Text>

            {error && (
              <Alert
                icon={<IconX size={16} />}
                title="Migration Error"
                color="red"
              >
                {error}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button variant="subtle" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                leftSection={<IconDatabase size={16} />}
                onClick={handleRunMigration}
                loading={loading}
              >
                Run Migration
              </Button>
            </Group>
          </>
        )}

        {step === 'running' && (
          <>
            <Alert
              icon={<IconDatabase size={16} />}
              title="Migration in Progress"
              color="blue"
            >
              Please wait while the database is being migrated...
            </Alert>
            <Progress value={100} animated />
          </>
        )}

        {step === 'complete' && (
          <>
            <Alert
              icon={<IconCheck size={16} />}
              title="Migration Complete"
              color="green"
            >
              Database migration completed successfully!
            </Alert>

            {backupPath && (
              <Text size="sm" c="dimmed">
                Backup created at: <Code>{backupPath}</Code>
              </Text>
            )}

            <Text size="sm" c="dimmed">
              Redirecting to dashboard...
            </Text>
          </>
        )}
      </Stack>
    </Modal>
  );
}
