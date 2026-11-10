// ============================================================
// MIRROR Core Types — Three-Plane Data Architecture
// Evidence | Intelligence | Governance
// ============================================================

// ─── Shared Primitives ───────────────────────────────────────

export type UUID = string;
export type ISOTimestamp = string;

export type InferenceSource =
  | 'local-on-device'   // Firebase AI Logic, on-device
  | 'cloud-gemini'      // Gemini via Firebase AI Logic, cloud
  | 'deterministic'     // Rule-based, no AI
  | 'human';            // Human-entered or human-approved

export type SyncStatus = 'local-only' | 'pending-sync' | 'synced' | 'conflict';

export type AssetType =
  | 'power-line'
  | 'transformer'
  | 'pole'
  | 'substation'
  | 'bridge'
  | 'road'
  | 'pipeline'
  | 'other';

export type DamageLevel = 'none' | 'minor' | 'moderate' | 'severe' | 'destroyed' | 'unknown';

// ─── PLANE 1: Evidence ───────────────────────────────────────
// Original field observations. Append-only after ingestion.

export interface InspectionRecord {
  id: UUID;
  incidentId: UUID;
  inspectorId: UUID;
  assetId: string;
  assetType: AssetType;
  locationLabel: string;
  coordinates?: { lat: number; lng: number };
  capturedAt: ISOTimestamp;
  ingestedAt: ISOTimestamp;
  syncStatus: SyncStatus;
  evidence: EvidenceItem[];
}

export interface EvidenceItem {
  id: UUID;
  inspectionId: UUID;
  type: 'photo' | 'video' | 'pdf' | 'note' | 'measurement';
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** Local IndexedDB blob reference or cloud Storage URL */
  storageRef: string;
  capturedAt: ISOTimestamp;
  ingestedAt: ISOTimestamp;
  /** Original field notes attached to this item */
  fieldNotes?: string;
  checksum: string;        // SHA-256 hex; computed on ingest
}

export interface Measurement {
  id: UUID;
  inspectionId: UUID;
  label: string;           // e.g. "Lean angle", "Span sag"
  value: number;
  unit: string;
  capturedAt: ISOTimestamp;
}

// ─── PLANE 2: Intelligence ───────────────────────────────────
// AI-generated. Always tagged with source and confidence.
// Never treated as ground truth. Can be regenerated.

export interface IntelligenceRecord {
  id: UUID;
  inspectionId: UUID;
  createdAt: ISOTimestamp;
  inferenceSource: InferenceSource;
  modelVersion?: string;
  confidence: number;      // 0.0 – 1.0
  content: IntelligenceContent;
}

export type IntelligenceContent =
  | ObservationSummary
  | ExtractedEntity
  | CrossInspectionAssessment
  | ConflictFlag;

export interface ObservationSummary {
  kind: 'observation-summary';
  text: string;
  damageLevel: DamageLevel;
  keyFindings: string[];
  caveats: string[];
}

export interface ExtractedEntity {
  kind: 'extracted-entity';
  entityType: 'asset' | 'person' | 'location' | 'measurement' | 'event';
  value: string;
  sourceEvidenceId: UUID;    // Which evidence item this came from
  contextSnippet?: string;
}

export interface CrossInspectionAssessment {
  kind: 'cross-inspection-assessment';
  incidentId: UUID;
  inspectionIds: UUID[];
  overallDamageLevel: DamageLevel;
  summary: string;
  priorityRanking: { inspectionId: UUID; priority: number; rationale: string }[];
  conflictIds: UUID[];       // References to ConflictFlag records
}

export interface ConflictFlag {
  kind: 'conflict-flag';
  conflictingInspectionIds: UUID[];
  description: string;
  resolution?: string;       // Human-entered if resolved
  resolvedAt?: ISOTimestamp;
  resolvedBy?: UUID;
}

// ─── PLANE 3: Governance ─────────────────────────────────────
// Immutable event log. Never deleted.

export interface GovernanceEvent {
  id: UUID;
  occurredAt: ISOTimestamp;
  actorId: UUID;
  actorType: 'inspector' | 'engineer' | 'ai-local' | 'ai-cloud' | 'system';
  eventType: GovernanceEventType;
  payload: Record<string, unknown>;
}

export type GovernanceEventType =
  | 'evidence-ingested'
  | 'evidence-synced'
  | 'sync-conflict-detected'
  | 'sync-conflict-resolved'
  | 'intelligence-generated'
  | 'intelligence-reviewed'
  | 'intelligence-approved'
  | 'intelligence-rejected'
  | 'report-drafted'
  | 'report-approved'
  | 'report-exported'
  | 'consent-given'
  | 'consent-revoked';

export interface Provenance {
  evidenceId: UUID;
  checksum: string;
  capturedAt: ISOTimestamp;
  capturedBy: UUID;
  ingestedAt: ISOTimestamp;
  ingestedOnDevice: string;  // User-agent or device identifier
  governanceEventIds: UUID[];
}

// ─── Incident & Report ───────────────────────────────────────

export interface Incident {
  id: UUID;
  title: string;
  description: string;
  occurredAt: ISOTimestamp;
  affectedArea: string;
  status: 'open' | 'under-assessment' | 'engineer-reviewed' | 'closed';
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface IncidentReport {
  id: UUID;
  incidentId: UUID;
  draftedAt: ISOTimestamp;
  draftedBy: InferenceSource;
  reviewedAt?: ISOTimestamp;
  reviewedBy?: UUID;
  approvedAt?: ISOTimestamp;
  approvedBy?: UUID;
  sections: ReportSection[];
  evidenceRefs: UUID[];
  intelligenceRefs: UUID[];
  governanceRefs: UUID[];
}

export interface ReportSection {
  id: UUID;
  heading: string;
  body: string;
  inferenceSource: InferenceSource;
  confidence?: number;
  humanEdited: boolean;
}
