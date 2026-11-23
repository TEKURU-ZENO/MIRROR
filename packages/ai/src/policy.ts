// MIRROR — Hybrid AI Task-Aware Policy Engine
// Dynamically routes inference workloads between on-device Gemini Nano,
// cloud Gemini 2.0 Flash, deterministic rule analysis, or deferred cloud queue.
// Decision factors: Task complexity, network connectivity, hardware capabilities, and data governance.

import type { InferenceSource } from '@mirror/core';
import { checkOnDeviceAvailability } from './inference.js';
import { isFirebaseConfigured } from './gemini.js';

export type TaskType =
  | 'field-triage'
  | 'entity-extraction'
  | 'observation-summary'
  | 'cross-inspection-synthesis'
  | 'conflict-detection';

export type PolicyTier =
  | 'local-on-device'
  | 'cloud-gemini'
  | 'deterministic'
  | 'queue-for-cloud';

export interface PolicyContext {
  isOnline: boolean;
  onDeviceAvailable?: boolean;
  allowCloud?: boolean;
  sensitiveAsset?: boolean;
}

export interface PolicyDecision {
  taskType: TaskType;
  selectedTier: PolicyTier;
  inferenceSource: InferenceSource;
  rationale: string;
  fallbackTier: PolicyTier;
}

/**
 * Determine the optimal execution tier for an inference task
 * according to MIRROR ADR-004 (Hybrid AI Architecture).
 */
export async function determineInferencePolicy(
  taskType: TaskType,
  context: PolicyContext
): Promise<PolicyDecision> {
  const { isOnline, allowCloud = true, sensitiveAsset = false } = context;
  const onDeviceAvailable =
    context.onDeviceAvailable ?? (await checkOnDeviceAvailability());
  const cloudConfigured = isFirebaseConfigured();

  // Rule 1: Sensitive infrastructure assets must remain on-device if cloud not explicitly permitted
  if (sensitiveAsset && !allowCloud) {
    if (onDeviceAvailable) {
      return {
        taskType,
        selectedTier: 'local-on-device',
        inferenceSource: 'local-on-device',
        rationale: 'Data sovereignty policy: sensitive asset data restricted to on-device processing.',
        fallbackTier: 'deterministic',
      };
    }
    return {
      taskType,
      selectedTier: 'deterministic',
      inferenceSource: 'deterministic',
      rationale: 'Data sovereignty policy: local AI unavailable; falling back to deterministic rule engine.',
      fallbackTier: 'deterministic',
    };
  }

  // Rule 2: Field quick triage — low-latency on-device priority
  if (taskType === 'field-triage') {
    if (onDeviceAvailable) {
      return {
        taskType,
        selectedTier: 'local-on-device',
        inferenceSource: 'local-on-device',
        rationale: 'Field quick triage prioritizes instantaneous zero-latency on-device processing.',
        fallbackTier: isOnline && cloudConfigured ? 'cloud-gemini' : 'deterministic',
      };
    }
    if (isOnline && cloudConfigured) {
      return {
        taskType,
        selectedTier: 'cloud-gemini',
        inferenceSource: 'cloud-gemini',
        rationale: 'Local AI unavailable; routed to cloud Gemini for field triage.',
        fallbackTier: 'deterministic',
      };
    }
    return {
      taskType,
      selectedTier: 'deterministic',
      inferenceSource: 'deterministic',
      rationale: 'Offline with no local AI model; executing deterministic triage rules.',
      fallbackTier: 'deterministic',
    };
  }

  // Rule 3: Entity extraction — prefer local for privacy & speed, fallback to cloud
  if (taskType === 'entity-extraction') {
    if (onDeviceAvailable) {
      return {
        taskType,
        selectedTier: 'local-on-device',
        inferenceSource: 'local-on-device',
        rationale: 'Structured entity extraction processed locally to minimize bandwidth and preserve field privacy.',
        fallbackTier: isOnline && cloudConfigured ? 'cloud-gemini' : 'deterministic',
      };
    }
    if (isOnline && cloudConfigured) {
      return {
        taskType,
        selectedTier: 'cloud-gemini',
        inferenceSource: 'cloud-gemini',
        rationale: 'On-device model unprovisioned; extracted entities via cloud Gemini.',
        fallbackTier: 'deterministic',
      };
    }
    return {
      taskType,
      selectedTier: 'deterministic',
      inferenceSource: 'deterministic',
      rationale: 'Offline entity parsing via regex & pattern heuristics.',
      fallbackTier: 'deterministic',
    };
  }

  // Rule 4: Observation summary — high quality narrative
  if (taskType === 'observation-summary') {
    if (isOnline && cloudConfigured && allowCloud) {
      return {
        taskType,
        selectedTier: 'cloud-gemini',
        inferenceSource: 'cloud-gemini',
        rationale: 'Cloud Gemini selected for high-fidelity multi-evidence observation narrative.',
        fallbackTier: onDeviceAvailable ? 'local-on-device' : 'deterministic',
      };
    }
    if (onDeviceAvailable) {
      return {
        taskType,
        selectedTier: 'local-on-device',
        inferenceSource: 'local-on-device',
        rationale: 'Offline or cloud unconfigured; running observation summary on local Gemini Nano.',
        fallbackTier: 'deterministic',
      };
    }
    return {
      taskType,
      selectedTier: 'deterministic',
      inferenceSource: 'deterministic',
      rationale: 'Offline with no local AI model; generating rule-based observation summary.',
      fallbackTier: 'deterministic',
    };
  }

  // Rule 5: Cross-inspection synthesis & Incident-wide conflict detection
  // These require high context window and reasoning across multiple sites
  if (taskType === 'cross-inspection-synthesis' || taskType === 'conflict-detection') {
    if (isOnline && cloudConfigured && allowCloud) {
      return {
        taskType,
        selectedTier: 'cloud-gemini',
        inferenceSource: 'cloud-gemini',
        rationale: 'Multi-site correlation requires large-context cloud Gemini reasoning.',
        fallbackTier: 'deterministic',
      };
    }
    if (!isOnline) {
      return {
        taskType,
        selectedTier: 'queue-for-cloud',
        inferenceSource: 'deterministic',
        rationale: 'Cross-inspection correlation queued for cloud execution when connectivity is restored.',
        fallbackTier: 'deterministic',
      };
    }
    return {
      taskType,
      selectedTier: 'deterministic',
      inferenceSource: 'deterministic',
      rationale: 'Cloud unconfigured; executing local heuristic multi-site correlation.',
      fallbackTier: 'deterministic',
    };
  }

  // Fallback default
  return {
    taskType,
    selectedTier: 'deterministic',
    inferenceSource: 'deterministic',
    rationale: 'Default deterministic baseline.',
    fallbackTier: 'deterministic',
  };
}
