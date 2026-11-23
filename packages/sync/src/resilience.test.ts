import { describe, it, expect, beforeEach } from 'vitest';
import {
  processDeadLetters,
  getDeadLetterQueue,
  requeueDeadLetter,
  checkStorageQuota,
} from './resilience.js';
import { db, type SyncQueueEntry } from './db.js';

describe('Sync Queue Resilience & Dead-Letter Quarantine', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
  });

  it('processDeadLetters quarantines entries with >= maxRetries into dead-letter state', async () => {
    const entries: SyncQueueEntry[] = [
      {
        id: 'q-fail-1',
        entityType: 'inspection',
        entityId: 'e-1',
        operation: 'create',
        status: 'failed',
        retryCount: 4,
        createdAt: new Date().toISOString(),
        errorMessage: '503 Service Unavailable',
      },
      {
        id: 'q-retryable',
        entityType: 'inspection',
        entityId: 'e-2',
        operation: 'create',
        status: 'failed',
        retryCount: 2,
        createdAt: new Date().toISOString(),
      },
    ];

    await db.syncQueue.bulkAdd(entries);

    const quarantined = await processDeadLetters(4);
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].id).toBe('q-fail-1');

    const dlq = await getDeadLetterQueue();
    expect(dlq).toHaveLength(1);
    expect(dlq[0].status).toBe('dead-letter');
    expect(dlq[0].errorMessage).toContain('[DLQ]');

    // The other entry remains failed/retryable
    const retryable = await db.syncQueue.get('q-retryable');
    expect(retryable?.status).toBe('failed');
  });

  it('requeueDeadLetter resets entry back to pending with 0 retries', async () => {
    await db.syncQueue.add({
      id: 'q-dlq-target',
      entityType: 'inspection',
      entityId: 'e-dlq',
      operation: 'create',
      status: 'dead-letter',
      retryCount: 4,
      createdAt: new Date().toISOString(),
      errorMessage: 'Fatal payload schema error',
    });

    const success = await requeueDeadLetter('q-dlq-target');
    expect(success).toBe(true);

    const requeued = await db.syncQueue.get('q-dlq-target');
    expect(requeued?.status).toBe('pending');
    expect(requeued?.retryCount).toBe(0);
    expect(requeued?.errorMessage).toBeUndefined();
  });

  it('checkStorageQuota returns quota status object', async () => {
    const status = await checkStorageQuota();
    expect(status).toHaveProperty('supported');
    expect(status).toHaveProperty('usageBytes');
    expect(status).toHaveProperty('quotaBytes');
    expect(status).toHaveProperty('usagePercent');
    expect(typeof status.isWarning).toBe('boolean');
  });
});
