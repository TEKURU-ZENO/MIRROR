// MIRROR — Data Privacy & Sovereign Asset Redaction Engine
// Sanitizes field notes, redacts Personally Identifiable Information (PII),
// and masks high-security grid coordinates before cloud dispatch or multi-tenant sharing.

import type { InspectionRecord, EvidenceItem } from './types.js';

export interface RedactionOptions {
  maskPII?: boolean;          // Redacts phone numbers, emails, and inspector personal notes
  maskExactCoordinates?: boolean; // Obfuscates classified substation GPS to low-precision grid
  precisionDecimals?: number; // Target coordinate precision (default: 1 decimal place approx ~11km)
}

export interface RedactionResult {
  redactedText: string;
  piiItemsCount: number;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

/**
 * Redact emails, phone numbers, and direct contact identifiers from field text
 * while strictly preserving infrastructure technical terms and numeric engineering measurements.
 */
export function redactPII(text: string): RedactionResult {
  if (!text) return { redactedText: '', piiItemsCount: 0 };

  let count = 0;

  let cleaned = text.replace(EMAIL_REGEX, () => {
    count++;
    return '[REDACTED-EMAIL]';
  });

  cleaned = cleaned.replace(PHONE_REGEX, () => {
    count++;
    return '[REDACTED-PHONE]';
  });

  return {
    redactedText: cleaned,
    piiItemsCount: count,
  };
}

/**
 * Obfuscate geographic coordinates for critical national infrastructure assets.
 * Reduces coordinate precision to ~11km (1 decimal place) to prevent exact geolocation disclosure.
 */
export function maskCoordinates(
  lat: number,
  lng: number,
  precision = 1
): { lat: number; lng: number } {
  const factor = Math.pow(10, precision);
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor,
  };
}

/**
 * Sanitize an entire inspection record and its evidence items prior to cloud transmission.
 */
export function sanitizeInspectionForCloud(
  inspection: InspectionRecord,
  options: RedactionOptions = {}
): InspectionRecord {
  const { maskPII: shouldMaskPII = true, maskExactCoordinates: shouldMaskCoord = false, precisionDecimals = 1 } = options;

  let coords = inspection.coordinates;
  if (shouldMaskCoord && coords) {
    coords = maskCoordinates(coords.lat, coords.lng, precisionDecimals);
  }

  const sanitizedEvidence: EvidenceItem[] = inspection.evidence.map((item) => {
    if (!item.fieldNotes || !shouldMaskPII) return item;
    const { redactedText } = redactPII(item.fieldNotes);
    return {
      ...item,
      fieldNotes: redactedText,
    };
  });

  return {
    ...inspection,
    coordinates: coords,
    evidence: sanitizedEvidence,
  };
}
