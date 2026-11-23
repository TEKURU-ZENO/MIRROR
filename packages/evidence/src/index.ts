export { ingestFile } from './ingest.js';
export type { IngestResult } from './ingest.js';
export {
  calculateDefectRiskScore,
  createDamageObservation,
  filterHighRiskObservations,
} from './multimodal.js';
export type {
  DefectType,
  DefectSeverity,
  MediaBoundingBox,
  DamageObservation,
} from './multimodal.js';
