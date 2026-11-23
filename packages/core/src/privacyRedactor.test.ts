import { describe, it, expect } from 'vitest';
import {
  redactPII,
  maskCoordinates,
  sanitizeInspectionForCloud,
} from './privacyRedactor.js';
import type { InspectionRecord } from './types.js';

describe('Data Privacy & Sovereign Asset Redaction Engine', () => {
  it('redacts emails and phone numbers while strictly preserving engineering measurements', () => {
    const rawNotes =
      'Contact field lead John at john.doe@utility.com or (555) 234-5678. Measured pole tilt at 14.5 deg with 45 psi hydraulic pressure on TR-08.';

    const result = redactPII(rawNotes);

    expect(result.piiItemsCount).toBe(2);
    expect(result.redactedText).toContain('[REDACTED-EMAIL]');
    expect(result.redactedText).toContain('[REDACTED-PHONE]');
    expect(result.redactedText).not.toContain('john.doe@utility.com');
    expect(result.redactedText).not.toContain('555');

    // Technical data must remain intact!
    expect(result.redactedText).toContain('14.5 deg');
    expect(result.redactedText).toContain('45 psi');
    expect(result.redactedText).toContain('TR-08');
  });

  it('maskCoordinates rounds geographic coordinates to low-precision grid', () => {
    const exact = { lat: 34.052234, lng: -118.243685 };
    const masked = maskCoordinates(exact.lat, exact.lng, 1);

    expect(masked.lat).toBe(34.1);
    expect(masked.lng).toBe(-118.2);
  });

  it('sanitizeInspectionForCloud sanitizes evidence notes and masks coordinates when requested', () => {
    const inspection: InspectionRecord = {
      id: 'insp-1',
      incidentId: 'inc-1',
      inspectorId: 'ins-1',
      assetId: 'SUB-SECRET',
      assetType: 'substation',
      locationLabel: 'Restricted Defense Substation',
      coordinates: { lat: 28.538336, lng: -81.379234 },
      capturedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      syncStatus: 'local-only',
      evidence: [
        {
          id: 'ev-1',
          inspectionId: 'insp-1',
          type: 'photo',
          storageRef: 'local://1',
          capturedAt: new Date().toISOString(),
          ingestedAt: new Date().toISOString(),
          checksum: 'a'.repeat(64),
          fieldNotes: 'Security officer call at 555-987-6543 regarding fence breach.',
        },
      ],
    };

    const sanitized = sanitizeInspectionForCloud(inspection, {
      maskPII: true,
      maskExactCoordinates: true,
      precisionDecimals: 1,
    });

    expect(sanitized.coordinates?.lat).toBe(28.5);
    expect(sanitized.coordinates?.lng).toBe(-81.4);
    expect(sanitized.evidence[0].fieldNotes).toContain('[REDACTED-PHONE]');
    expect(sanitized.evidence[0].fieldNotes).not.toContain('555-987-6543');
  });
});
