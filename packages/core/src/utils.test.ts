import { describe, it, expect } from 'vitest';
import { generateId, nowISO, sha256Hex, assertNever, formatBytes } from './utils.js';

// UUID v4 regex: 8-4-4-4-12 hex, version nibble = 4, variant bits = 8/9/a/b
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateId', () => {
  it('returns a valid UUID v4 string', () => {
    const id = generateId();
    expect(id).toMatch(UUID_V4_RE);
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

describe('nowISO', () => {
  it('returns a valid ISO 8601 string', () => {
    const iso = nowISO();
    // Must parse without NaN and end with 'Z'
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('is close to the current time', () => {
    const before = Date.now();
    const iso = nowISO();
    const after = Date.now();
    const ts = Date.parse(iso);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('sha256Hex', () => {
  it('returns a 64-character lowercase hex string', async () => {
    const data = new TextEncoder().encode('hello');
    const hash = await sha256Hex(data.buffer);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces deterministic output for the same input', async () => {
    const data = new TextEncoder().encode('deterministic');
    const hash1 = await sha256Hex(data.buffer);
    const hash2 = await sha256Hex(new TextEncoder().encode('deterministic').buffer);
    expect(hash1).toBe(hash2);
  });

  it('produces the known SHA-256 for "hello"', async () => {
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const data = new TextEncoder().encode('hello');
    const hash = await sha256Hex(data.buffer);
    expect(hash).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('produces different hashes for different inputs', async () => {
    const a = await sha256Hex(new TextEncoder().encode('aaa').buffer);
    const b = await sha256Hex(new TextEncoder().encode('bbb').buffer);
    expect(a).not.toBe(b);
  });

  it('handles empty input', async () => {
    // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hash = await sha256Hex(new ArrayBuffer(0));
    expect(hash).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('formatBytes', () => {
  it('formats bytes (< 1 KB)', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/);
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 ** 2)).toBe('1.0 MB');
    expect(formatBytes(5.5 * 1024 ** 2)).toBe('5.5 MB');
    expect(formatBytes(1024 ** 3 - 1)).toMatch(/MB$/);
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.00 GB');
    expect(formatBytes(2.5 * 1024 ** 3)).toBe('2.50 GB');
  });
});

describe('assertNever', () => {
  it('throws an error with the unexpected value', () => {
    expect(() => assertNever('oops' as never)).toThrowError(
      /Unexpected value.*oops/,
    );
  });
});
