import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine } from './syncEngine.js';
import { db } from './db.js';
import type { InspectionRecord } from '@mirror/core';

describe('SyncEngine', () => {
  const engine = new SyncEngine();

  const dummyInspection: InspectionRecord = {
    id: 'test-inspection-1',
    incidentId: 'test-incident-1',
    inspectorId: 'test-inspector-1',
    assetId: 'POLE-42',
    assetType: 'pole',
    locationLabel: 'Site North 1',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'local-only',
    evidence: [],
  };

  beforeEach(async () => {
    await db.syncQueue.clear();
    await db.inspections.clear();
    await db.inspections.put(dummyInspection);
  });

  it('enqueue() creates a pending entry in the sync queue', async () => {
    await engine.enqueue('inspection', dummyInspection.id, 'create');

    const entries = await db.syncQueue.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].entityType).toBe('inspection');
    expect(entries[0].entityId).toBe(dummyInspection.id);
    expect(entries[0].operation).toBe('create');
    expect(entries[0].status).toBe('pending');
    expect(entries[0].retryCount).toBe(0);
  });

  it('enqueue() is idempotent and does not create duplicate pending entries', async () => {
    await engine.enqueue('inspection', dummyInspection.id, 'create');
    await engine.enqueue('inspection', dummyInspection.id, 'update');

    const entries = await db.syncQueue.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0].operation).toBe('create');
  });

  it('processQueue() marks entries as simulated (NOT done) when no cloud syncHandler is configured [P0 Fix]', async () => {
    const offlineEngine = new SyncEngine(null);
    await offlineEngine.enqueue('inspection', dummyInspection.id, 'create');

    const result = await offlineEngine.processQueue();
    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);

    const entry = await db.syncQueue.where('entityId').equals(dummyInspection.id).first();
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('simulated');

    // The inspection record must NOT be falsely marked as 'synced'
    const inspection = await db.inspections.get(dummyInspection.id);
    expect(inspection?.syncStatus).not.toBe('synced');
  });

  it('processQueue() marks entries as done when syncHandler succeeds', async () => {
    const syncedCalls: Array<{ collection: string; docId: string; data: Record<string, unknown> }> = [];
    const onlineEngine = new SyncEngine(null, async (collection, docId, data) => {
      syncedCalls.push({ collection, docId, data });
    });

    await onlineEngine.enqueue('inspection', dummyInspection.id, 'create');
    const result = await onlineEngine.processQueue();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(syncedCalls).toHaveLength(1);
    expect(syncedCalls[0].collection).toBe('inspections');
    expect(syncedCalls[0].docId).toBe(dummyInspection.id);

    const entry = await db.syncQueue.where('entityId').equals(dummyInspection.id).first();
    expect(entry?.status).toBe('done');

    const inspection = await db.inspections.get(dummyInspection.id);
    expect(inspection?.syncStatus).toBe('synced');
  });

  it('processQueue() marks entries as failed and increments retryCount when syncHandler throws', async () => {
    const failingEngine = new SyncEngine(null, async () => {
      throw new Error('Network timeout during sync');
    });

    await failingEngine.enqueue('inspection', dummyInspection.id, 'create');
    const result = await failingEngine.processQueue();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);

    const entry = await db.syncQueue.where('entityId').equals(dummyInspection.id).first();
    expect(entry?.status).toBe('failed');
    expect(entry?.retryCount).toBe(1);
    expect(entry?.errorMessage).toContain('Network timeout');
  });

  it('getQueueStatus() accurately counts pending, failed, done, and simulated', async () => {
    await db.syncQueue.bulkAdd([
      {
        id: 'q1',
        entityType: 'inspection',
        entityId: 'e1',
        operation: 'create',
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q2',
        entityType: 'inspection',
        entityId: 'e2',
        operation: 'create',
        status: 'failed',
        retryCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q3',
        entityType: 'inspection',
        entityId: 'e3',
        operation: 'create',
        status: 'done',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q4',
        entityType: 'inspection',
        entityId: 'e4',
        operation: 'create',
        status: 'simulated',
        retryCount: 0,
        createdAt: new Date().toISOString(),
      },
    ]);

    const status = await engine.getQueueStatus();
    expect(status.pending).toBe(1);
    expect(status.failed).toBe(1);
    expect(status.done).toBe(1);
    expect(status.simulated).toBe(1);
  });
});
