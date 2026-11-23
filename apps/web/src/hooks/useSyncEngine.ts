import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { syncEngine, getDeadLetterQueue, processDeadLetters } from '@mirror/sync';

export interface SyncState {
  pending: number;
  failed: number;
  done: number;
  simulated: number;
  deadLetter: number;
  lastSync?: string;
  isSyncing: boolean;
}

const POLL_INTERVAL_MS = 30_000;

export function useSyncEngine(): {
  syncState: SyncState;
  triggerSync: () => Promise<void>;
} {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>({
    pending: 0,
    failed: 0,
    done: 0,
    simulated: 0,
    deadLetter: 0,
    isSyncing: false,
  });

  const refreshStatus = useCallback(async () => {
    await processDeadLetters(4);
    const [status, dlq] = await Promise.all([
      syncEngine.getQueueStatus(),
      getDeadLetterQueue(),
    ]);
    setSyncState((prev) => ({
      ...prev,
      ...status,
      deadLetter: dlq.length,
    }));
  }, []);

  const triggerSync = useCallback(async (): Promise<void> => {
    setSyncState((prev) => ({ ...prev, isSyncing: true }));
    try {
      await syncEngine.processQueue();
      await processDeadLetters(4);
      const [status, dlq] = await Promise.all([
        syncEngine.getQueueStatus(),
        getDeadLetterQueue(),
      ]);
      setSyncState({
        ...status,
        deadLetter: dlq.length,
        lastSync: new Date().toISOString(),
        isSyncing: false,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // On mount and whenever isOnline changes to true
  useEffect(() => {
    if (isOnline) {
      void triggerSync();
    } else {
      void refreshStatus();
    }
  }, [isOnline, triggerSync, refreshStatus]);

  // Poll every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const intervalId = setInterval(() => {
      void triggerSync();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isOnline, triggerSync]);

  return { syncState, triggerSync };
}
