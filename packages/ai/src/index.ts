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
export { buildSynthesisPrompt, buildSummaryPrompt, buildConflictPrompt } from './prompts.js';
