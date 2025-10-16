import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { migrationsApi } from '../services/api';
import MigrationModal from '../components/MigrationModal';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check migration status on mount
  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const status = await migrationsApi.getStatus();
      setMigrationNeeded(status.needed);
    } catch (err) {
      // If migration check fails, assume migration might be needed
      console.error('Failed to check migration status:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      
      // After successful login, check if migration is needed
      if (migrationNeeded) {
        setShowMigrationModal(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationComplete = () => {
    setMigrationNeeded(false);
    setShowMigrationModal(false);
    navigate('/');
  };

  return (
    <>
      <MigrationModal
        opened={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        onComplete={handleMigrationComplete}
      />

      <Container size={420} my={100}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Title order={2} ta="center" mb="md">
            Timesheet & Invoice
          </Title>

          <form onSubmit={handleSubmit}>
            <Stack>
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Username"
                placeholder="Enter your username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                data-testid="login-username"
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
              />

              <Button type="submit" fullWidth loading={loading} data-testid="login-submit">
                Sign in
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </>
  );
}
