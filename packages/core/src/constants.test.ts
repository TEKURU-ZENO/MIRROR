import { describe, it, expect } from 'vitest';
import {
  SYNC_RETRY_DELAYS_MS,
  CONFIDENCE_THRESHOLDS,
  DAMAGE_LEVEL_SEVERITY,
} from './constants.js';

describe('SYNC_RETRY_DELAYS_MS', () => {
  it('has 4 entries (exponential backoff steps)', () => {
    expect(SYNC_RETRY_DELAYS_MS).toHaveLength(4);
  });

  it('contains only positive numbers', () => {
    SYNC_RETRY_DELAYS_MS.forEach((ms) => {
      expect(ms).toBeGreaterThan(0);
    });
  });

  it('values are in strictly increasing order', () => {
    for (let i = 1; i < SYNC_RETRY_DELAYS_MS.length; i++) {
      expect(SYNC_RETRY_DELAYS_MS[i]).toBeGreaterThan(
        SYNC_RETRY_DELAYS_MS[i - 1],
      );
    }
  });
});

describe('CONFIDENCE_THRESHOLDS', () => {
  it('has HIGH, MEDIUM, and LOW keys', () => {
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('HIGH');
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('MEDIUM');
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('LOW');
  });

  it('HIGH > MEDIUM > LOW', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(
      CONFIDENCE_THRESHOLDS.MEDIUM,
    );
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeGreaterThan(
      CONFIDENCE_THRESHOLDS.LOW,
    );
  });

  it('all values are in [0, 1]', () => {
    Object.values(CONFIDENCE_THRESHOLDS).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});

describe('DAMAGE_LEVEL_SEVERITY', () => {
  it('has the expected damage-level keys', () => {
    const keys = Object.keys(DAMAGE_LEVEL_SEVERITY);
    expect(keys).toContain('none');
    expect(keys).toContain('minor');
    expect(keys).toContain('moderate');
    expect(keys).toContain('severe');
    expect(keys).toContain('destroyed');
    expect(keys).toContain('unknown');
  });

  it('severity increases from none → destroyed', () => {
    const ordered = ['none', 'minor', 'moderate', 'severe', 'destroyed'] as const;
    for (let i = 1; i < ordered.length; i++) {
      expect(DAMAGE_LEVEL_SEVERITY[ordered[i]]).toBeGreaterThan(
        DAMAGE_LEVEL_SEVERITY[ordered[i - 1]],
      );
    }
  });

  it('unknown has a negative sentinel value', () => {
    expect(DAMAGE_LEVEL_SEVERITY['unknown']).toBeLessThan(0);
  });
});
