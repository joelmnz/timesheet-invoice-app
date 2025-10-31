import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../services/api';
import { TimeEntry } from '../types';
import { notifications } from '@mantine/notifications';
import {
  saveOfflineTimer,
  getUnsyncedTimers,
  markTimerSynced,
  clearSyncedTimers,
  OfflineTimerState,
} from '../utils/timerDb';

interface TimerContextType {
  currentTimer: TimeEntry | null;
  isLoading: boolean;
  startTimer: (projectId: number) => Promise<void>;
  stopTimer: (projectId: number) => Promise<void>;
  updateTimerNotes: (note: string | undefined) => Promise<void>;
  refetch: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function TimerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [notificationShown, setNotificationShown] = useState(false);

  const { data: currentTimer, isLoading, refetch } = useQuery({
    queryKey: ['current-timer'],
    queryFn: projectsApi.getCurrentTimer,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (currentTimer && currentTimer.startAt && !notificationShown) {
      const startTime = new Date(currentTimer.startAt).getTime();
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed >= SIX_HOURS_MS) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Timer Running Long', {
            body: 'Your timer has been running for over 6 hours',
            icon: '/pwa-192x192.png',
            tag: 'timer-6hours',
          });
        }
        notifications.show({
          title: 'Timer Running Long',
          message: 'Your timer has been running for over 6 hours',
          color: 'yellow',
          autoClose: false,
        });
        setNotificationShown(true);
      }
    } else if (!currentTimer) {
      setNotificationShown(false);
    }
  }, [currentTimer, notificationShown]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    async function syncOfflineTimers() {
      if (navigator.onLine) {
        try {
          const unsyncedTimers = await getUnsyncedTimers();
          for (const timer of unsyncedTimers) {
            try {
              if (timer.clientStopAt) {
                await projectsApi.stopTimer(timer.projectId, timer.clientStopAt);
              } else {
                await projectsApi.startTimer(timer.projectId);
              }
              await markTimerSynced(timer.id);
            } catch (error) {
              console.error('Failed to sync timer:', error);
            }
          }
          await clearSyncedTimers();
          queryClient.invalidateQueries({ queryKey: ['current-timer'] });
        } catch (error) {
          console.error('Error syncing offline timers:', error);
        }
      }
    }

    syncOfflineTimers();
    window.addEventListener('online', syncOfflineTimers);
    return () => window.removeEventListener('online', syncOfflineTimers);
  }, [queryClient]);

  const startTimerMutation = useMutation({
    mutationFn: async (projectId: number) => {
      if (!navigator.onLine) {
        const offlineTimer: OfflineTimerState = {
          id: `timer-${Date.now()}`,
          projectId,
          startAt: new Date().toISOString(),
          synced: false,
          createdAt: new Date().toISOString(),
        };
        await saveOfflineTimer(offlineTimer);
        throw new Error('Offline - timer will sync when online');
      }
      return projectsApi.startTimer(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-timer'] });
      notifications.show({
        title: 'Timer Started',
        message: 'Time tracking has begun',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const clientStopAt = new Date().toISOString();
      if (!navigator.onLine) {
        const offlineTimer: OfflineTimerState = {
          id: `timer-stop-${Date.now()}`,
          projectId,
          startAt: currentTimer?.startAt || new Date().toISOString(),
          clientStopAt,
          synced: false,
          createdAt: new Date().toISOString(),
        };
        await saveOfflineTimer(offlineTimer);
        throw new Error('Offline - timer will sync when online');
      }
      return projectsApi.stopTimer(projectId, clientStopAt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-timer'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      notifications.show({
        title: 'Timer Stopped',
        message: 'Time entry saved',
        color: 'blue',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  const updateTimerNotesMutation = useMutation({
    mutationFn: async (note: string | undefined) => {
      return projectsApi.updateCurrentTimerNotes(note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-timer'] });
      notifications.show({
        title: 'Notes Updated',
        message: 'Timer notes have been saved',
        color: 'blue',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    },
  });

  return (
    <TimerContext.Provider
      value={{
        currentTimer: currentTimer || null,
        isLoading,
        startTimer: startTimerMutation.mutateAsync,
        stopTimer: stopTimerMutation.mutateAsync,
        updateTimerNotes: updateTimerNotesMutation.mutateAsync,
        refetch,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}
