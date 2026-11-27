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
  generateCloudJSON,
  callGeminiRestAPI,
  getGeminiApiKey,
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

export {
  analyzeDamageCascades,
  clusterSpatialDamage,
} from './spatialGraph.js';
export type {
  AssetDamageState,
  DamageCascadeImpact,
  SpatialDamageCluster,
} from './spatialGraph.js';

export {
  prioritizeInspectionSites,
} from './prioritization.js';
export type {
  TriageActionRecommendation,
  SiteTriageRecommendation,
} from './prioritization.js';

export {
  correlateCrossInspectionEvidence,
} from './crossInspection.js';
export type {
  SystemicPattern,
  CrossInspectionCorrelationReport,
} from './crossInspection.js';

export {
  runBenchmarkSuite,
  getStandardBenchmarkScenarios,
} from './benchmark.js';
export type {
  BenchmarkScenario,
  ScenarioEvaluation,
  BenchmarkSuiteResult,
} from './benchmark.js';

export {
  assessDamageWithGemini,
} from './damageAssessment.js';
export type {
  DamageAssessmentInput,
  AssessedDamageResult,
  QuantitativeReading,
} from './damageAssessment.js';

export {
  evaluateDamageAssessmentSuite,
  getHeldOutIncidentDataset,
} from './damageAssessmentEval.js';
export type {
  RealHeldOutIncidentCase,
  CaseEvaluationResult,
  DamageAssessmentEvaluationReport,
  ExpectedMeasurement,
} from './damageAssessmentEval.js';
