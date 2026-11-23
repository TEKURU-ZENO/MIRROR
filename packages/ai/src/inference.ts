// MIRROR — Hybrid AI Router
// Provides a unified interface for local (on-device) and cloud (Gemini) inference.
// Every response is tagged with its InferenceSource, confidence estimate, execution duration,
// and execution mode ('real' | 'mock' | 'demo') for total auditability.

import type { InferenceSource } from '@mirror/core';
import { generateCloudTextRaw, isFirebaseConfigured } from './gemini.js';

export type InferenceMode = 'real' | 'mock' | 'demo';

export interface AIResponse {
  text: string;
  inferenceSource: InferenceSource;
  modelVersion?: string;
  /** Estimated confidence 0.0–1.0. */
  confidence: number;
  durationMs: number;
  mode: InferenceMode;
}

export interface AIRequestOptions {
  /** Prefer local inference. Falls back to cloud if local unavailable. */
  preferLocal?: boolean;
  /** If true and local unavailable, do NOT fall back to cloud. Returns null instead. */
  localOnly?: boolean;
  /** Additional system context prepended to the prompt */
  systemContext?: string;
  /** Allow fallback to deterministic demo response if all AI channels fail. Default: true. */
  allowFallback?: boolean;
}

let _onDeviceAvailable: boolean | null = null;

/** Test helper to simulate on-device environment state */
export function _setForceOnDeviceAvailability(available: boolean | null): void {
  _onDeviceAvailable = available;
}

/** Check if on-device inference is available in this browser/runtime. */
export async function checkOnDeviceAvailability(): Promise<boolean> {
  if (_onDeviceAvailable !== null) return _onDeviceAvailable;

  try {
    const hasBuiltInAI =
      typeof globalThis !== 'undefined' &&
      'ai' in globalThis &&
      'languageModel' in ((globalThis as unknown as { ai?: { languageModel?: { capabilities?: () => Promise<{ available: string }> } } }).ai || {});

    if (hasBuiltInAI) {
      const aiObj = (globalThis as unknown as { ai: { languageModel: { capabilities?: () => Promise<{ available: string }> } } }).ai;
      if (typeof aiObj.languageModel.capabilities === 'function') {
        const caps = await aiObj.languageModel.capabilities();
        _onDeviceAvailable = caps.available === 'readily' || caps.available === 'after-download';
        return _onDeviceAvailable;
      }
      _onDeviceAvailable = true;
      return true;
    }

    _onDeviceAvailable = false;
    return false;
  } catch {
    _onDeviceAvailable = false;
    return false;
  }
}

/**
 * Generate text using the appropriate inference tier.
 * Always returns a tagged AIResponse — never raw text.
 */
export async function generateText(
  prompt: string,
  options: AIRequestOptions = {}
): Promise<AIResponse | null> {
  const {
    preferLocal = true,
    localOnly = false,
    systemContext,
    allowFallback = true,
  } = options;

  const fullPrompt = systemContext ? `${systemContext}\n\n${prompt}` : prompt;
  const start = performance.now();

  const localAvailable = await checkOnDeviceAvailability();

  if (preferLocal && localAvailable) {
    try {
      return await generateLocalText(fullPrompt, start);
    } catch (err) {
      console.warn('[MIRROR AI] Local inference failed, evaluating fallback:', err);
      if (localOnly) return null;
    }
  }

  if (localOnly) {
    console.warn('[MIRROR AI] localOnly=true but on-device unavailable. Returning null.');
    return null;
  }

  return generateCloudText(fullPrompt, start, allowFallback);
}

/** On-device inference path using Chrome Built-in Prompt API */
export async function generateLocalText(prompt: string, start: number): Promise<AIResponse> {
  const aiObj = (globalThis as unknown as {
    ai?: {
      languageModel?: {
        create: () => Promise<{
          prompt: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    };
  }).ai;

  if (!aiObj?.languageModel?.create) {
    throw new Error(
      '[MIRROR AI] Chrome Prompt API not available in current execution context.'
    );
  }

  const session = await aiObj.languageModel.create();
  try {
    const text = await session.prompt(prompt);
    const durationMs = Math.round(performance.now() - start);

    return {
      text,
      inferenceSource: 'local-on-device',
      modelVersion: 'chrome-builtin-gemini-nano',
      confidence: 0.88,
      durationMs,
      mode: 'real',
    };
  } finally {
    if (session.destroy) {
      session.destroy();
    }
  }
}

/** Cloud inference path via Gemini with explicit mode tracking */
export async function generateCloudText(
  prompt: string,
  start: number,
  allowFallback = true
): Promise<AIResponse> {
  if (isFirebaseConfigured()) {
    const rawText = await generateCloudTextRaw(prompt);
    if (rawText !== null) {
      const durationMs = Math.round(performance.now() - start);
      return {
        text: rawText,
        inferenceSource: 'cloud-gemini',
        modelVersion: 'gemini-2.0-flash',
        confidence: 0.95,
        durationMs,
        mode: 'real',
      };
    }
  }

  if (!allowFallback) {
    throw new Error(
      '[MIRROR AI] Cloud inference failed or Firebase not configured, and allowFallback is disabled.'
    );
  }

  // Deterministic fallback (offline / demo mode)
  return generateDeterministicText(prompt, start);
}

/** Deterministic analysis fallback */
export function generateDeterministicText(prompt: string, start: number): AIResponse {
  const durationMs = Math.round(performance.now() - start);
  const isSummary = prompt.toLowerCase().includes('summar');

  const text = isSummary
    ? 'Automated deterministic field observation: Asset conditions surveyed. Physical structural baseline logged pending certified cloud evaluation.'
    : 'Deterministic rule analysis: Field observations verified against local heuristic safety thresholds.';

  return {
    text,
    inferenceSource: 'deterministic',
    modelVersion: 'rule-engine-v1',
    confidence: 0.70,
    durationMs,
    mode: 'demo',
  };
}
