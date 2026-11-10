// MIRROR Core Utilities

import type { UUID, ISOTimestamp } from './types.js';

/** Generate a RFC4122 v4 UUID using the Web Crypto API */
export function generateId(): UUID {
  return crypto.randomUUID();
}

/** Return the current UTC time as an ISO 8601 string */
export function nowISO(): ISOTimestamp {
  return new Date().toISOString();
}

/**
 * Compute a SHA-256 checksum of an ArrayBuffer.
 * Uses the Web Crypto API — available in all modern browsers and Node 20+.
 */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Type-safe exhaustive check for switch statements */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/** Format bytes to a human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
