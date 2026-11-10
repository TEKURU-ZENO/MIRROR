// MIRROR — Dexie database schema
// Three-plane local store: Evidence | Intelligence | Governance

import Dexie, { type Table } from 'dexie';
import type {
  InspectionRecord,
  EvidenceItem,
  Measurement,
  IntelligenceRecord,
  GovernanceEvent,
  Provenance,
  Incident,
  IncidentReport,
} from '@mirror/core';

export class MirrorDB extends Dexie {
  // ── Evidence Plane ──────────────────────────────────────────
  inspections!: Table<InspectionRecord>;
  evidenceItems!: Table<EvidenceItem>;
  measurements!: Table<Measurement>;

  // ── Intelligence Plane ──────────────────────────────────────
  intelligence!: Table<IntelligenceRecord>;

  // ── Governance Plane ────────────────────────────────────────
  governanceEvents!: Table<GovernanceEvent>;
  provenance!: Table<Provenance>;

  // ── Incident & Reports ──────────────────────────────────────
  incidents!: Table<Incident>;
  reports!: Table<IncidentReport>;

  // ── Sync Queue ──────────────────────────────────────────────
  syncQueue!: Table<SyncQueueEntry>;

  constructor() {
    super('mirror-db');

    this.version(1).stores({
      // Evidence Plane
      inspections:    '&id, incidentId, inspectorId, assetId, syncStatus, capturedAt',
      evidenceItems:  '&id, inspectionId, type, capturedAt',
      measurements:   '&id, inspectionId, capturedAt',

      // Intelligence Plane
      intelligence:   '&id, inspectionId, inferenceSource, createdAt, [inspectionId+inferenceSource]',

      // Governance Plane
      governanceEvents: '&id, occurredAt, actorType, eventType',
      provenance:       '&evidenceId, capturedAt',

      // Incident & Reports
      incidents: '&id, status, createdAt',
      reports:   '&id, incidentId, reviewedAt',

      // Sync Queue
      syncQueue: '&id, entityType, entityId, status, createdAt',
    });
  }
}

export interface SyncQueueEntry {
  id: string;
  entityType: 'inspection' | 'evidence' | 'measurement' | 'intelligence' | 'governance';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  status: 'pending' | 'in-flight' | 'done' | 'failed';
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  errorMessage?: string;
}

/** Singleton instance */
export const db = new MirrorDB();
