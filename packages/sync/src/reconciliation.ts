// MIRROR — Two-Way Reconciliation & Change Detection Engine
// Compares local IndexedDB state with remote Firestore state to detect
// fast-forwards (local ahead / remote ahead) and surface concurrent mutation conflicts.
// Per ADR-005: Automated silent overwrites are forbidden. Conflicts must be surfaced.

import type { ISOTimestamp } from '@mirror/core';

export interface VersionedEntity {
  id: string;
  capturedAt?: ISOTimestamp;
  ingestedAt?: ISOTimestamp;
  updatedAt?: ISOTimestamp;
  syncStatus?: string;
  [key: string]: unknown;
}

export type ReconciliationDecision =
  | 'PUSH_LOCAL'      // Local is ahead; safely push to cloud
  | 'PULL_REMOTE'     // Remote is ahead and local unchanged; safely update local
  | 'IN_SYNC'         // Both are identical; no-op
  | 'SURFACE_CONFLICT'; // Concurrent modification detected; surface to human reviewer

export interface EntityReconciliation<T extends VersionedEntity> {
  entityId: string;
  decision: ReconciliationDecision;
  local?: T;
  remote?: T;
  reason: string;
}

export interface ReconciliationPlan<T extends VersionedEntity> {
  pushToRemote: T[];
  pullToLocal: T[];
  inSyncCount: number;
  conflicts: EntityReconciliation<T>[];
  totalEvaluated: number;
}

/**
 * Extract the most recent modification timestamp from an entity.
 */
function getTimestamp(entity: VersionedEntity): number {
  const ts = entity.updatedAt ?? entity.ingestedAt ?? entity.capturedAt;
  return ts ? new Date(ts).getTime() : 0;
}

/**
 * Compare local and remote records for a single entity and determine the reconciliation action.
 */
export function reconcileRecord<T extends VersionedEntity>(
  local?: T,
  remote?: T,
  lastSyncedTimestamp?: number
): EntityReconciliation<T> {
  // Case 1: Exists only locally -> new record created offline -> push to remote
  if (local && !remote) {
    return {
      entityId: local.id,
      decision: 'PUSH_LOCAL',
      local,
      reason: 'New record captured offline; pending cloud ingestion.',
    };
  }

  // Case 2: Exists only remotely -> new record in cloud -> pull to local
  if (!local && remote) {
    return {
      entityId: remote.id,
      decision: 'PULL_REMOTE',
      remote,
      reason: 'New remote record captured by another field unit or engineer.',
    };
  }

  if (local && remote) {
    const localTime = getTimestamp(local);
    const remoteTime = getTimestamp(remote);

    // If both records have identical timestamps and content signature
    if (localTime === remoteTime) {
      return {
        entityId: local.id,
        decision: 'IN_SYNC',
        local,
        remote,
        reason: 'Local and remote state are synchronized.',
      };
    }

    // Check if both modified since the last known sync checkpoint
    const lastSync = lastSyncedTimestamp ?? 0;
    const localModifiedSinceSync = localTime > lastSync;
    const remoteModifiedSinceSync = remoteTime > lastSync;

    if (localModifiedSinceSync && remoteModifiedSinceSync && lastSync > 0) {
      // Both modified independently -> Three-way merge conflict!
      return {
        entityId: local.id,
        decision: 'SURFACE_CONFLICT',
        local,
        remote,
        reason: `Concurrent modification: Local edited at ${new Date(localTime).toISOString()}, Remote edited at ${new Date(remoteTime).toISOString()}`,
      };
    }

    // Otherwise fast-forward to the newer record
    if (localTime > remoteTime) {
      return {
        entityId: local.id,
        decision: 'PUSH_LOCAL',
        local,
        remote,
        reason: 'Local modifications are newer than cloud record.',
      };
    } else {
      return {
        entityId: local.id,
        decision: 'PULL_REMOTE',
        local,
        remote,
        reason: 'Remote cloud record is newer than local copy.',
      };
    }
  }

  throw new Error('Unreachable: both local and remote are undefined.');
}

/**
 * Reconcile a full collection of local entities against remote entities.
 */
export function reconcileCollections<T extends VersionedEntity>(
  localEntities: T[],
  remoteEntities: T[],
  lastSyncedTimestamp?: number
): ReconciliationPlan<T> {
  const localMap = new Map<string, T>(localEntities.map((e) => [e.id, e]));
  const remoteMap = new Map<string, T>(remoteEntities.map((e) => [e.id, e]));
  const allIds = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);

  const pushToRemote: T[] = [];
  const pullToLocal: T[] = [];
  const conflicts: EntityReconciliation<T>[] = [];
  let inSyncCount = 0;

  for (const id of allIds) {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);
    const rec = reconcileRecord(local, remote, lastSyncedTimestamp);

    switch (rec.decision) {
      case 'PUSH_LOCAL':
        if (rec.local) pushToRemote.push(rec.local);
        break;
      case 'PULL_REMOTE':
        if (rec.remote) pullToLocal.push(rec.remote);
        break;
      case 'IN_SYNC':
        inSyncCount++;
        break;
      case 'SURFACE_CONFLICT':
        conflicts.push(rec);
        break;
    }
  }

  return {
    pushToRemote,
    pullToLocal,
    inSyncCount,
    conflicts,
    totalEvaluated: allIds.size,
  };
}
