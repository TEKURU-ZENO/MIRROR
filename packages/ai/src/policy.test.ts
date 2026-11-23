import { describe, it, expect, vi } from 'vitest';
import { determineInferencePolicy } from './policy.js';
import * as geminiModule from './gemini.js';

describe('Hybrid AI Policy Engine', () => {
  it('routes field-triage to local-on-device when local AI is available', async () => {
    const decision = await determineInferencePolicy('field-triage', {
      isOnline: true,
      onDeviceAvailable: true,
    });

    expect(decision.selectedTier).toBe('local-on-device');
    expect(decision.inferenceSource).toBe('local-on-device');
    expect(decision.rationale).toContain('zero-latency');
  });

  it('restricts sensitive asset inference to local when allowCloud is false', async () => {
    const decision = await determineInferencePolicy('cross-inspection-synthesis', {
      isOnline: true,
      allowCloud: false,
      sensitiveAsset: true,
      onDeviceAvailable: true,
    });

    expect(decision.selectedTier).toBe('local-on-device');
    expect(decision.rationale).toContain('sovereignty');
  });

  it('routes sensitive asset to deterministic when cloud is disallowed and local AI is absent', async () => {
    const decision = await determineInferencePolicy('entity-extraction', {
      isOnline: true,
      allowCloud: false,
      sensitiveAsset: true,
      onDeviceAvailable: false,
    });

    expect(decision.selectedTier).toBe('deterministic');
    expect(decision.inferenceSource).toBe('deterministic');
  });

  it('routes cross-inspection synthesis to queue-for-cloud when offline', async () => {
    const decision = await determineInferencePolicy('cross-inspection-synthesis', {
      isOnline: false,
      onDeviceAvailable: true,
    });

    expect(decision.selectedTier).toBe('queue-for-cloud');
    expect(decision.rationale).toContain('queued for cloud');
  });

  it('routes observation-summary to cloud-gemini when online and configured', async () => {
    vi.spyOn(geminiModule, 'isFirebaseConfigured').mockReturnValue(true);

    const decision = await determineInferencePolicy('observation-summary', {
      isOnline: true,
      onDeviceAvailable: true,
      allowCloud: true,
    });

    expect(decision.selectedTier).toBe('cloud-gemini');
    expect(decision.inferenceSource).toBe('cloud-gemini');
    expect(decision.rationale).toContain('Cloud Gemini selected');

    vi.restoreAllMocks();
  });

  it('falls back to deterministic when offline with no local AI', async () => {
    const decision = await determineInferencePolicy('field-triage', {
      isOnline: false,
      onDeviceAvailable: false,
    });

    expect(decision.selectedTier).toBe('deterministic');
    expect(decision.inferenceSource).toBe('deterministic');
  });
});
