// MIRROR — Sync Engine
// Manages the local sync queue and pushes records to Firestore when online.

import { generateId, nowISO, SYNC_RETRY_DELAYS_MS } from '@mirror/core';
import { db } from './db.js';
import type { SyncQueueEntry } from './db.js';

export interface FirestoreInstance {
  [key: string]: unknown;
}

export type SyncHandler = (
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
) => Promise<void>;

export class SyncEngine {
  private isRunning = false;
  private firestore: FirestoreInstance | null;
  private syncHandler?: SyncHandler;

  constructor(
    firestore: FirestoreInstance | null = null,
    syncHandler?: SyncHandler
  ) {
    this.firestore = firestore;
    this.syncHandler = syncHandler;
  }

  async enqueue(
    entityType: SyncQueueEntry['entityType'],
    entityId: string,
    operation: SyncQueueEntry['operation']
  ): Promise<void> {
    // Idempotency: skip if a pending or in-flight entry already exists for this entity
    const existing = await db.syncQueue
      .where('entityId')
      .equals(entityId)
      .filter((e) => e.status === 'pending' || e.status === 'in-flight')
      .first();

    if (existing) return;

    const entry: SyncQueueEntry = {
      id: generateId(),
      entityType,
      entityId,
      operation,
      status: 'pending',
      retryCount: 0,
      createdAt: nowISO(),
    };

    await db.syncQueue.add(entry);
  }

  async processQueue(): Promise<{ synced: number; failed: number; skipped: number }> {
    if (this.isRunning) return { synced: 0, failed: 0, skipped: 0 };
    this.isRunning = true;

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // Find all pending entries or failed entries that are eligible for retry
      const entries = await db.syncQueue
        .filter(
          (e) =>
            e.status === 'pending' ||
            (e.status === 'failed' && e.retryCount < SYNC_RETRY_DELAYS_MS.length)
        )
        .toArray();

      for (const entry of entries) {
        // Exponential backoff check
        if (entry.lastAttemptAt && entry.retryCount > 0) {
          const delayIndex = Math.min(
            entry.retryCount - 1,
            SYNC_RETRY_DELAYS_MS.length - 1
          );
          const delayMs = SYNC_RETRY_DELAYS_MS[delayIndex] ?? 1000;
          const nextAttemptTime = new Date(entry.lastAttemptAt).getTime() + delayMs;
          if (Date.now() < nextAttemptTime) {
            skipped++;
            continue;
          }
        }

        // Mark in-flight
        await db.syncQueue.update(entry.id, {
          status: 'in-flight',
          lastAttemptAt: nowISO(),
        });

        try {
          const collectionName = `${entry.entityType}s`;
          const data = await this.fetchEntityData(entry.entityType, entry.entityId);

          if (this.syncHandler) {
            // Custom sync handler provided — use it
            if (data) {
              await this.syncHandler(collectionName, entry.entityId, data);
            }
            // Handler succeeded — mark as truly synced
            await db.syncQueue.update(entry.id, { status: 'done' });
            await this.markEntitySynced(entry.entityType, entry.entityId);
            synced++;
          } else if (this.firestore !== null) {
            // Firestore instance provided without custom handler
            // TODO: implement direct Firestore write path
            // For now, this is a known gap — mark as simulated, NOT done
            console.warn(
              `[MIRROR Sync] Firestore instance provided but no sync handler configured. ` +
              `Entry ${entry.id} marked as simulated.`
            );
            await db.syncQueue.update(entry.id, { status: 'simulated' });
            skipped++;
          } else {
            // No Firestore, no handler — NEVER mark as 'done'
            // This is demo/offline mode: mark as 'simulated' so the UI
            // can clearly distinguish it from a real cloud sync
            console.info(
              `[MIRROR Sync] No cloud backend configured. ` +
              `Entry ${entry.id} marked as simulated (not synced).`
            );
            await db.syncQueue.update(entry.id, { status: 'simulated' });
            skipped++;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          await db.syncQueue.update(entry.id, {
            status: 'failed',
            retryCount: entry.retryCount + 1,
            errorMessage,
          });
          failed++;
        }
      }
    } finally {
      this.isRunning = false;
    }

    return { synced, failed, skipped };
  }

  async getQueueStatus(): Promise<{
    pending: number;
    failed: number;
    done: number;
    simulated: number;
  }> {
    const [pending, failed, done, simulated] = await Promise.all([
      db.syncQueue.where('status').equals('pending').count(),
      db.syncQueue.where('status').equals('failed').count(),
      db.syncQueue.where('status').equals('done').count(),
      db.syncQueue.where('status').equals('simulated').count(),
    ]);
    return { pending, failed, done, simulated };
  }

  // ── Private helpers ──────────────────────────────────────────

  private async fetchEntityData(
    entityType: SyncQueueEntry['entityType'],
    entityId: string
  ): Promise<Record<string, unknown> | undefined> {
    switch (entityType) {
      case 'inspection': {
        const record = await db.inspections.get(entityId);
        return record as Record<string, unknown> | undefined;
      }
      case 'evidence': {
        const record = await db.evidenceItems.get(entityId);
        return record as Record<string, unknown> | undefined;
      }
      case 'measurement': {
        const record = await db.measurements.get(entityId);
        return record as Record<string, unknown> | undefined;
      }
      case 'intelligence': {
        const record = await db.intelligence.get(entityId);
        return record as Record<string, unknown> | undefined;
      }
      case 'governance': {
        const record = await db.governanceEvents.get(entityId);
        return record as Record<string, unknown> | undefined;
      }
      default:
        return undefined;
    }
  }

  private async markEntitySynced(
    entityType: SyncQueueEntry['entityType'],
    entityId: string
  ): Promise<void> {
    if (entityType === 'inspection') {
      await db.inspections.update(entityId, { syncStatus: 'synced' });
    }
  }
}

export const syncEngine = new SyncEngine();
