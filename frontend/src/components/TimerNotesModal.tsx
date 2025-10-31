import { Modal, Textarea, Stack, Button, Group, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import { TimeEntry } from '../types';

interface TimerNotesModalProps {
  opened: boolean;
  onClose: () => void;
  currentTimer: TimeEntry | null;
  onSave: (note: string | undefined) => Promise<void>;
}

export default function TimerNotesModal({
  opened,
  onClose,
  currentTimer,
  onSave,
}: TimerNotesModalProps) {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (opened && currentTimer) {
      setNote(currentTimer.note || '');
    }
  }, [opened, currentTimer]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(note || undefined);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentTimer) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Timer Notes"
      size="md"
    >
      <Stack gap="md">
        <div>
          <Text size="sm" fw={600} c="dimmed">Client</Text>
          <Text size="md">{currentTimer.client?.name || 'Unknown'}</Text>
        </div>

        <div>
          <Text size="sm" fw={600} c="dimmed">Project</Text>
          <Text size="md">{currentTimer.project?.name || 'Unknown'}</Text>
        </div>

        <Textarea
          label="Notes"
          placeholder="Add notes about what you're working on..."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          autoFocus
          autosize
          minRows={3}
          maxRows={10}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
