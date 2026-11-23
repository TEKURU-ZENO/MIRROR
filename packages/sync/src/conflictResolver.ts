// MIRROR — Field Conflict Resolution Engine
// Enforces ADR-005: Conflicts between local field observations and remote cloud records
// must never be silently overwritten. Provides human-in-the-loop resolution strategies:
// 'keep-local', 'keep-remote', and 'fork-both' (provenance-preserving split).

import { generateId, nowISO } from '@mirror/core';
import type { UUID, InspectionRecord, GovernanceEvent } from '@mirror/core';
import { db } from './db.js';

export type ConflictResolutionStrategy =
  | 'keep-local'
  | 'keep-remote'
  | 'fork-both'
  | 'custom-merge';

export interface ResolveConflictParams {
  conflictId?: UUID;
  entityId: string;
  entityType: 'inspection' | 'report';
  strategy: ConflictResolutionStrategy;
  actorId: UUID;
  actorType: 'engineer' | 'inspector';
  justification: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  customMergedData?: Record<string, unknown>;
}

export interface ResolveConflictResult {
  success: boolean;
  resolvedEntityId: string;
  forkedEntityId?: string;
  strategyApplied: ConflictResolutionStrategy;
  governanceEventId: UUID;
}

/**
 * Apply a human-reviewed conflict resolution strategy and record an immutable governance audit event.
 */
export async function resolveConflict(
  params: ResolveConflictParams
): Promise<ResolveConflictResult> {
  const {
    conflictId,
    entityId,
    entityType,
    strategy,
    actorId,
    actorType,
    justification,
    localData,
    remoteData,
    customMergedData,
  } = params;

  let resolvedEntityId = entityId;
  let forkedEntityId: string | undefined;

  // 1. Execute resolution strategy
  if (entityType === 'inspection') {
    switch (strategy) {
      case 'keep-local': {
        // Retain local record, mark it as modified and ready for sync
        await db.inspections.update(entityId, {
          ...localData,
          syncStatus: 'pending-sync',
          updatedAt: nowISO(),
        });
        break;
      }

      case 'keep-remote': {
        // Overwrite local with remote record, mark as synced
        await db.inspections.update(entityId, {
          ...remoteData,
          syncStatus: 'synced',
          updatedAt: nowISO(),
        });
        break;
      }

      case 'fork-both': {
        // Keep remote at original ID, fork local into a new distinct record with link
        forkedEntityId = generateId();
        const forkedRecord: InspectionRecord = {
          ...(localData as unknown as InspectionRecord),
          id: forkedEntityId,
          syncStatus: 'pending-sync',
          capturedAt: nowISO(),
          ingestedAt: nowISO(),
        };

        await Promise.all([
          db.inspections.update(entityId, {
            ...remoteData,
            syncStatus: 'synced',
          }),
          db.inspections.put(forkedRecord),
        ]);
        break;
      }

      case 'custom-merge': {
        const merged = customMergedData ?? { ...remoteData, ...localData };
        await db.inspections.update(entityId, {
          ...merged,
          syncStatus: 'pending-sync',
          updatedAt: nowISO(),
        });
        break;
      }
    }
  }

  // 2. Mark conflict flag as resolved in Intelligence Plane if conflictId was provided
  if (conflictId) {
    const intelRecord = await db.intelligence.get(conflictId);
    if (intelRecord && intelRecord.content.kind === 'conflict-flag') {
      intelRecord.content.resolution = `Resolved via ${strategy}: ${justification}`;
      intelRecord.content.resolvedAt = nowISO();
      intelRecord.content.resolvedBy = actorId;
      await db.intelligence.put(intelRecord);
    }
  }

  // 3. Log append-only Governance Event in Plane 3
  const govEventId = generateId();
  const govEvent: GovernanceEvent = {
    id: govEventId,
    occurredAt: nowISO(),
    actorId,
    actorType,
    eventType: 'sync-conflict-resolved',
    payload: {
      conflictId,
      entityId,
      entityType,
      strategy,
      justification,
      forkedEntityId,
    },
  };
  await db.governanceEvents.add(govEvent);

  return {
    success: true,
    resolvedEntityId,
    forkedEntityId,
    strategyApplied: strategy,
    governanceEventId: govEventId,
  };
}
