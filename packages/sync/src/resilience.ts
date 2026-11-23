// MIRROR — Sync Queue Resilience, Dead-Letter Queue & Storage Watchdog
// Prevents sync starvation, manages persistent failure quarantine, and monitors IndexedDB storage limits.

import { EVIDENCE_QUOTA_WARNING_BYTES, nowISO } from '@mirror/core';
import { db, type SyncQueueEntry } from './db.js';

export interface StorageQuotaStatus {
  supported: boolean;
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  isWarning: boolean;
  isCritical: boolean;
}

/**
 * Scan the sync queue and quarantine entries that have exceeded max retry attempts into the Dead-Letter Queue (DLQ).
 */
export async function processDeadLetters(maxRetries = 4): Promise<SyncQueueEntry[]> {
  const failedEntries = await db.syncQueue
    .where('status')
    .equals('failed')
    .filter((e) => e.retryCount >= maxRetries)
    .toArray();

  const deadLetters: SyncQueueEntry[] = [];

  for (const entry of failedEntries) {
    await db.syncQueue.update(entry.id, {
      status: 'dead-letter',
      errorMessage: `[DLQ] Quarantined after ${entry.retryCount} failed synchronization attempts: ${entry.errorMessage ?? 'Unknown error'}`,
    });
    deadLetters.push({ ...entry, status: 'dead-letter' });
  }

  return deadLetters;
}

/**
 * Fetch all entries currently in the Dead-Letter Queue.
 */
export async function getDeadLetterQueue(): Promise<SyncQueueEntry[]> {
  return db.syncQueue.where('status').equals('dead-letter').toArray();
}

/**
 * Re-queue an entry from the Dead-Letter Queue back into pending state for retry.
 */
export async function requeueDeadLetter(entryId: string): Promise<boolean> {
  const entry = await db.syncQueue.get(entryId);
  if (!entry || entry.status !== 'dead-letter') return false;

  await db.syncQueue.update(entryId, {
    status: 'pending',
    retryCount: 0,
    lastAttemptAt: nowISO(),
    errorMessage: undefined,
  });

  return true;
}

/**
 * Check browser storage quota and return warning/critical flags.
 */
export async function checkStorageQuota(): Promise<StorageQuotaStatus> {
  if (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage?.estimate === 'function'
  ) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageBytes = estimate.usage ?? 0;
      const quotaBytes = estimate.quota ?? 1024 * 1024 * 1024; // Default 1GB
      const usagePercent = quotaBytes > 0 ? Number(((usageBytes / quotaBytes) * 100).toFixed(1)) : 0;

      return {
        supported: true,
        usageBytes,
        quotaBytes,
        usagePercent,
        isWarning: usageBytes >= EVIDENCE_QUOTA_WARNING_BYTES,
        isCritical: usagePercent >= 95,
      };
    } catch (err) {
      console.warn('[MIRROR Resilience] Storage estimate error:', err);
    }
  }

  return {
    supported: false,
    usageBytes: 0,
    quotaBytes: 1024 * 1024 * 1024,
    usagePercent: 0,
    isWarning: false,
    isCritical: false,
  };
}

/**
 * Creates an event listener for browser network reconnection with jitter to prevent thunder-herd sync requests.
 */
export function setupNetworkSyncTrigger(
  onReconnect: () => Promise<void> | void,
  maxJitterMs = 2500
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    // Add jitter so 10 field inspectors reconnecting simultaneously do not hammer cloud functions at the same millisecond
    const jitter = Math.floor(Math.random() * maxJitterMs);
    setTimeout(() => {
      void onReconnect();
    }, jitter);
  };

  window.addEventListener('online', handleOnline);
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
