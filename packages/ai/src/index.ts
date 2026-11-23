export {
  generateText,
  generateLocalText,
  generateCloudText,
  checkOnDeviceAvailability,
  _setForceOnDeviceAvailability,
} from './inference.js';
export type { AIResponse, AIRequestOptions, InferenceMode } from './inference.js';

export {
  synthesizeInspections,
  summarizeInspection,
  detectConflicts,
  isFirebaseConfigured,
  generateCloudTextRaw,
} from './gemini.js';

export {
  buildSynthesisPrompt,
  buildSummaryPrompt,
  buildConflictPrompt,
} from './prompts.js';

export {
  determineInferencePolicy,
} from './policy.js';
export type {
  TaskType,
  PolicyTier,
  PolicyContext,
  PolicyDecision,
} from './policy.js';

export {
  extractEntitiesFromEvidenceItem,
  extractMeasurementsFromEvidence,
  extractEntitiesFromInspection,
} from './extraction.js';
export type {
  GroundedEntity,
  ExtractedMeasurement,
} from './extraction.js';

export {
  validateEvidenceCitations,
  validateReportCitations,
} from './citationValidator.js';
export type {
  CitationIssue,
  CitationValidationReport,
} from './citationValidator.js';
