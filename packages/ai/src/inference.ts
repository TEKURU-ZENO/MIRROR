// MIRROR — Firebase AI Logic wrapper
// Provides a unified interface for local (on-device) and cloud (Gemini) inference.
// Every response is tagged with its InferenceSource and a confidence estimate.

import type { InferenceSource } from '@mirror/core';

export interface AIResponse {
  text: string;
  inferenceSource: InferenceSource;
  modelVersion?: string;
  /** Estimated confidence 0.0–1.0. Set by post-processing heuristics until Firebase exposes it natively. */
  confidence: number;
  durationMs: number;
}

export interface AIRequestOptions {
  /** Prefer local inference. Falls back to cloud if local unavailable. */
  preferLocal?: boolean;
  /** If true and local unavailable, do NOT fall back to cloud. Returns null instead. */
  localOnly?: boolean;
  /** Additional system context prepended to the prompt */
  systemContext?: string;
}

/**
 * SPIKE VALIDATION TARGET
 *
 * This module is intentionally thin until the Day 1 spike confirms:
 * 1. Firebase AI Logic web on-device is available on the target Chrome version.
 * 2. The SDK exposes inference-source metadata.
 *
 * Until validated, this module uses a stub that always routes to cloud
 * and manually tags inference source.
 */

let _onDeviceAvailable: boolean | null = null;

/** Check if on-device inference is available in this browser/runtime. */
export async function checkOnDeviceAvailability(): Promise<boolean> {
  if (_onDeviceAvailable !== null) return _onDeviceAvailable;

  try {
    // TODO (Spike T-01): Replace with actual Firebase AI Logic on-device availability check
    // e.g. const { onDeviceModel } = await import('firebase/ai');
    // const session = await onDeviceModel.createTextSession();
    // _onDeviceAvailable = session !== null;

    // Stub: check for Chrome AI API (Prompt API) as a proxy indicator
    const hasBuiltInAI =
      'ai' in globalThis && 'languageModel' in (globalThis as { ai?: { languageModel?: unknown } }).ai!;

    _onDeviceAvailable = hasBuiltInAI;
    console.info(`[MIRROR AI] On-device availability: ${_onDeviceAvailable}`);
    return _onDeviceAvailable;
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
  const { preferLocal = true, localOnly = false } = options;
  const start = performance.now();

  const localAvailable = await checkOnDeviceAvailability();

  if (preferLocal && localAvailable) {
    return generateLocalText(prompt, start);
  }

  if (localOnly) {
    console.warn('[MIRROR AI] localOnly=true but on-device unavailable. Returning null.');
    return null;
  }

  return generateCloudText(prompt, start);
}

/** On-device inference path */
async function generateLocalText(_prompt: string, _start: number): Promise<AIResponse> {
  // TODO (Spike T-01, T-05): Implement via Firebase AI Logic on-device SDK
  // Placeholder until spike confirms the API surface.
  throw new Error(
    '[MIRROR AI] On-device inference not yet implemented. Run the Day 1 spike first.'
  );
}

/** Cloud inference path via Gemini through Firebase AI Logic */
async function generateCloudText(_prompt: string, _start: number): Promise<AIResponse> {
  // TODO: Import and initialize Firebase AI Logic cloud SDK
  // const { getGenerativeModel } = await import('firebase/ai');
  // const model = getGenerativeModel(app, { model: 'gemini-2.0-flash' });
  // const result = await model.generateContent(prompt);
  throw new Error(
    '[MIRROR AI] Cloud inference not yet implemented. Configure Firebase project first.'
  );
}
