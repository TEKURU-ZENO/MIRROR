import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkOnDeviceAvailability,
  generateText,
  generateLocalText,
  _setForceOnDeviceAvailability,
} from './inference.js';

describe('AI Router & Inference Engine', () => {
  beforeEach(() => {
    _setForceOnDeviceAvailability(null);
  });

  afterEach(() => {
    _setForceOnDeviceAvailability(null);
    delete (globalThis as { ai?: unknown }).ai;
  });

  it('checkOnDeviceAvailability() defaults to false in standard Node/unsupported environment', async () => {
    const available = await checkOnDeviceAvailability();
    expect(available).toBe(false);
  });

  it('checkOnDeviceAvailability() honors forced availability for testing', async () => {
    _setForceOnDeviceAvailability(true);
    expect(await checkOnDeviceAvailability()).toBe(true);

    _setForceOnDeviceAvailability(false);
    expect(await checkOnDeviceAvailability()).toBe(false);
  });

  it('generateText() with localOnly: true returns null when on-device is unavailable', async () => {
    _setForceOnDeviceAvailability(false);
    const result = await generateText('Summarize field notes', { localOnly: true });
    expect(result).toBeNull();
  });

  it('generateText() defaults to deterministic fallback when Firebase is not configured', async () => {
    _setForceOnDeviceAvailability(false);
    const result = await generateText('Please summarize damages', { preferLocal: false });

    expect(result).not.toBeNull();
    expect(result?.inferenceSource).toBe('deterministic');
    expect(result?.mode).toBe('demo');
    expect(result?.modelVersion).toBe('rule-engine-v1');
    expect(result?.durationMs).toBeGreaterThanOrEqual(0);
    expect(result?.confidence).toBe(0.70);
  });

  it('generateText() with allowFallback: false throws error when cloud is unconfigured', async () => {
    _setForceOnDeviceAvailability(false);
    await expect(
      generateText('Summarize damage', { preferLocal: false, allowFallback: false })
    ).rejects.toThrow(/allowFallback is disabled/);
  });

  it('generateLocalText() executes prompt via Chrome Built-in AI when available', async () => {
    const mockPromptFn = vi.fn().mockResolvedValue('Local Gemini Nano damage summary');
    const mockDestroyFn = vi.fn();

    (globalThis as { ai?: unknown }).ai = {
      languageModel: {
        create: vi.fn().mockResolvedValue({
          prompt: mockPromptFn,
          destroy: mockDestroyFn,
        }),
      },
    };

    const start = performance.now();
    const result = await generateLocalText('Inspect leaning pole', start);

    expect(mockPromptFn).toHaveBeenCalledWith('Inspect leaning pole');
    expect(mockDestroyFn).toHaveBeenCalled();
    expect(result.text).toBe('Local Gemini Nano damage summary');
    expect(result.inferenceSource).toBe('local-on-device');
    expect(result.modelVersion).toBe('chrome-builtin-gemini-nano');
    expect(result.mode).toBe('real');
    expect(result.confidence).toBe(0.88);
  });
});
