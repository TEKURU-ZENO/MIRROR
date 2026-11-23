export { db, MirrorDB } from './db.js';
export type { SyncQueueEntry } from './db.js';

export { SyncEngine, syncEngine } from './syncEngine.js';
export type { FirestoreInstance, SyncHandler } from './syncEngine.js';

export { detectConflictsLocally } from './conflictDetector.js';

export {
  reconcileRecord,
  reconcileCollections,
} from './reconciliation.js';
export type {
  VersionedEntity,
  ReconciliationDecision,
  EntityReconciliation,
  ReconciliationPlan,
} from './reconciliation.js';

export {
  resolveConflict,
} from './conflictResolver.js';
export type {
  ConflictResolutionStrategy,
  ResolveConflictParams,
  ResolveConflictResult,
} from './conflictResolver.js';

export {
  processDeadLetters,
  getDeadLetterQueue,
  requeueDeadLetter,
  checkStorageQuota,
  setupNetworkSyncTrigger,
} from './resilience.js';
export type {
  StorageQuotaStatus,
} from './resilience.js';
