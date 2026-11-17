import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { syncEngine } from '@mirror/sync';

export interface SyncState {
  pending: number;
  failed: number;
  done: number;
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
    isSyncing: false,
  });

  const triggerSync = useCallback(async (): Promise<void> => {
    setSyncState((prev) => ({ ...prev, isSyncing: true }));
    try {
      await syncEngine.processQueue();
      const status = await syncEngine.getQueueStatus();
      setSyncState({
        ...status,
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
      // Refresh status when offline so banner reflects current count
      void syncEngine.getQueueStatus().then((status) => {
        setSyncState((prev) => ({ ...prev, ...status }));
      });
    }
  }, [isOnline, triggerSync]);

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
