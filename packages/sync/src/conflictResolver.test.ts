import { describe, it, expect, beforeEach } from 'vitest';
import { resolveConflict } from './conflictResolver.js';
import { db } from './db.js';
import type { InspectionRecord, IntelligenceRecord, ConflictFlag } from '@mirror/core';

describe('Field Conflict Resolution Engine', () => {
  const testInspection: InspectionRecord = {
    id: 'insp-conflict-1',
    incidentId: 'inc-1',
    inspectorId: 'insp-local-user',
    assetId: 'POLE-101',
    assetType: 'pole',
    locationLabel: 'Site Oak 1',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'conflict',
    evidence: [],
  };

  const conflictFlag: ConflictFlag = {
    kind: 'conflict-flag',
    conflictingInspectionIds: ['insp-conflict-1'],
    description: 'Local inspection reports severe lean; cloud record claims undamaged.',
  };

  const conflictRecord: IntelligenceRecord = {
    id: 'intel-conflict-flag-1',
    inspectionId: 'insp-conflict-1',
    createdAt: new Date().toISOString(),
    inferenceSource: 'deterministic',
    confidence: 1.0,
    content: conflictFlag,
  };

  beforeEach(async () => {
    await db.inspections.clear();
    await db.intelligence.clear();
    await db.governanceEvents.clear();

    await db.inspections.put(testInspection);
    await db.intelligence.put(conflictRecord);
  });

  it('resolves conflict with "keep-local" and logs governance event', async () => {
    const res = await resolveConflict({
      conflictId: conflictRecord.id,
      entityId: testInspection.id,
      entityType: 'inspection',
      strategy: 'keep-local',
      actorId: 'engineer-lead-01',
      actorType: 'engineer',
      justification: 'Field inspector confirmed tilt on ground with digital inclinometer.',
      localData: { locationLabel: 'Site Oak 1 (Verified Leaning)' },
      remoteData: { locationLabel: 'Site Oak 1 (Cloud Outdated)' },
    });

    expect(res.success).toBe(true);
    expect(res.strategyApplied).toBe('keep-local');

    // Verify local record updated
    const updated = await db.inspections.get(testInspection.id);
    expect(updated?.locationLabel).toBe('Site Oak 1 (Verified Leaning)');
    expect(updated?.syncStatus).toBe('pending-sync');

    // Verify Governance Event logged
    const govEvents = await db.governanceEvents.toArray();
    expect(govEvents).toHaveLength(1);
    expect(govEvents[0].eventType).toBe('sync-conflict-resolved');
    expect(govEvents[0].payload.justification).toContain('digital inclinometer');

    // Verify ConflictFlag marked resolved
    const intel = await db.intelligence.get(conflictRecord.id);
    const flag = intel?.content as ConflictFlag;
    expect(flag.resolution).toContain('Resolved via keep-local');
    expect(flag.resolvedBy).toBe('engineer-lead-01');
  });

  it('resolves conflict with "keep-remote" by overwriting local record with remote data', async () => {
    const res = await resolveConflict({
      entityId: testInspection.id,
      entityType: 'inspection',
      strategy: 'keep-remote',
      actorId: 'engineer-lead-01',
      actorType: 'engineer',
      justification: 'Remote cloud telemetry supersedes preliminary visual survey.',
      localData: { locationLabel: 'Old Local' },
      remoteData: { locationLabel: 'Certified Remote Sensor Label' },
    });

    expect(res.success).toBe(true);
    const updated = await db.inspections.get(testInspection.id);
    expect(updated?.locationLabel).toBe('Certified Remote Sensor Label');
    expect(updated?.syncStatus).toBe('synced');
  });

  it('resolves conflict with "fork-both" preserving both records independently', async () => {
    const res = await resolveConflict({
      entityId: testInspection.id,
      entityType: 'inspection',
      strategy: 'fork-both',
      actorId: 'inspector-field-01',
      actorType: 'inspector',
      justification: 'Both observations valid under different weather time windows.',
      localData: { locationLabel: 'Storm Surge Observation' },
      remoteData: { locationLabel: 'Pre-Storm Baseline' },
    });

    expect(res.success).toBe(true);
    expect(res.forkedEntityId).toBeDefined();

    // Original ID holds remote
    const original = await db.inspections.get(testInspection.id);
    expect(original?.locationLabel).toBe('Pre-Storm Baseline');

    // Forked ID holds local
    const forked = await db.inspections.get(res.forkedEntityId!);
    expect(forked).toBeDefined();
    expect(forked?.locationLabel).toBe('Storm Surge Observation');
    expect(forked?.syncStatus).toBe('pending-sync');
  });
});
