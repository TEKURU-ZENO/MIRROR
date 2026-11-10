// MIRROR Core Constants

export const MIRROR_VERSION = '0.0.1';

export const EVIDENCE_QUOTA_WARNING_BYTES = 0.8 * 1024 * 1024 * 1024; // 80% of 1GB

export const SYNC_RETRY_DELAYS_MS = [1_000, 5_000, 30_000, 120_000]; // exponential backoff

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.65,
  LOW: 0.0,
} as const;

export const INFERENCE_SOURCE_LABELS: Record<string, string> = {
  'local-on-device': 'On-device AI',
  'cloud-gemini': 'Cloud AI (Gemini)',
  'deterministic': 'Rule-based',
  'human': 'Human',
};

export const DAMAGE_LEVEL_SEVERITY: Record<string, number> = {
  none: 0,
  minor: 1,
  moderate: 2,
  severe: 3,
  destroyed: 4,
  unknown: -1,
};
