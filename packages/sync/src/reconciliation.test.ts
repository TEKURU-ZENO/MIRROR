import { describe, it, expect } from 'vitest';
import {
  reconcileRecord,
  reconcileCollections,
  type VersionedEntity,
} from './reconciliation.js';

describe('Two-Way Reconciliation & Change Detection Engine', () => {
  const baseTime = 1700000000000;
  const iso = (ms: number) => new Date(ms).toISOString();

  it('detects new local record and decides PUSH_LOCAL', () => {
    const local: VersionedEntity = { id: 'insp-1', capturedAt: iso(baseTime) };
    const rec = reconcileRecord(local, undefined);

    expect(rec.decision).toBe('PUSH_LOCAL');
    expect(rec.entityId).toBe('insp-1');
  });

  it('detects new remote record and decides PULL_REMOTE', () => {
    const remote: VersionedEntity = { id: 'insp-2', capturedAt: iso(baseTime) };
    const rec = reconcileRecord(undefined, remote);

    expect(rec.decision).toBe('PULL_REMOTE');
    expect(rec.entityId).toBe('insp-2');
  });

  it('identifies identical records as IN_SYNC', () => {
    const local: VersionedEntity = { id: 'insp-3', capturedAt: iso(baseTime) };
    const remote: VersionedEntity = { id: 'insp-3', capturedAt: iso(baseTime) };
    const rec = reconcileRecord(local, remote);

    expect(rec.decision).toBe('IN_SYNC');
  });

  it('fast-forwards local when local is strictly newer', () => {
    const local: VersionedEntity = { id: 'insp-4', updatedAt: iso(baseTime + 5000) };
    const remote: VersionedEntity = { id: 'insp-4', updatedAt: iso(baseTime) };
    const rec = reconcileRecord(local, remote);

    expect(rec.decision).toBe('PUSH_LOCAL');
  });

  it('surfaces SURFACE_CONFLICT when both local and remote changed since last sync checkpoint [ADR-005]', () => {
    const lastSyncCheckpoint = baseTime;
    const local: VersionedEntity = { id: 'insp-5', updatedAt: iso(baseTime + 2000) };
    const remote: VersionedEntity = { id: 'insp-5', updatedAt: iso(baseTime + 3000) };

    const rec = reconcileRecord(local, remote, lastSyncCheckpoint);

    expect(rec.decision).toBe('SURFACE_CONFLICT');
    expect(rec.reason).toContain('Concurrent modification');
  });

  it('reconcileCollections aggregates push, pull, in-sync, and conflicts correctly', () => {
    const localList: VersionedEntity[] = [
      { id: '1', capturedAt: iso(baseTime) }, // in sync
      { id: '2', capturedAt: iso(baseTime + 1000) }, // push
      { id: '3', updatedAt: iso(baseTime + 2000) }, // conflict
    ];

    const remoteList: VersionedEntity[] = [
      { id: '1', capturedAt: iso(baseTime) }, // in sync
      { id: '3', updatedAt: iso(baseTime + 3000) }, // conflict
      { id: '4', capturedAt: iso(baseTime) }, // pull
    ];

    const plan = reconcileCollections(localList, remoteList, baseTime);

    expect(plan.inSyncCount).toBe(1);
    expect(plan.pushToRemote).toHaveLength(1);
    expect(plan.pushToRemote[0].id).toBe('2');
    expect(plan.pullToLocal).toHaveLength(1);
    expect(plan.pullToLocal[0].id).toBe('4');
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0].entityId).toBe('3');
    expect(plan.totalEvaluated).toBe(4);
  });
});
