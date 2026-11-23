import { describe, it, expect } from 'vitest';
import {
  validateEvidenceCitations,
  validateReportCitations,
} from './citationValidator.js';
import type { EvidenceItem, IncidentReport, Provenance } from '@mirror/core';

describe('End-to-End Evidence Citation Validator', () => {
  const dummyItem: EvidenceItem = {
    id: 'ev-valid-01',
    inspectionId: 'insp-01',
    type: 'photo',
    storageRef: 'local://test/1',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    fieldNotes: 'Substation fence breach verified.',
  };

  const dummyProv: Provenance = {
    evidenceId: dummyItem.id,
    checksum: dummyItem.checksum,
    capturedAt: dummyItem.capturedAt,
    capturedBy: 'inspector-1',
    ingestedAt: dummyItem.ingestedAt,
    ingestedOnDevice: 'Chrome on Windows',
    governanceEventIds: ['gov-1'],
  };

  it('passes validation when cited evidence exists and checksum matches provenance', () => {
    const report = validateEvidenceCitations([dummyItem.id], [dummyItem], [dummyProv]);

    expect(report.isValid).toBe(true);
    expect(report.totalCitations).toBe(1);
    expect(report.verifiedCount).toBe(1);
    expect(report.brokenCount).toBe(0);
    expect(report.integrityScore).toBe(1.0);
    expect(report.issues).toHaveLength(0);
  });

  it('fails validation when cited evidence ID is missing from evidence vault', () => {
    const report = validateEvidenceCitations(['non-existent-id'], [dummyItem], [dummyProv]);

    expect(report.isValid).toBe(false);
    expect(report.totalCitations).toBe(1);
    expect(report.verifiedCount).toBe(0);
    expect(report.brokenCount).toBe(1);
    expect(report.integrityScore).toBe(0);
    expect(report.issues[0].code).toBe('MISSING_EVIDENCE');
  });

  it('fails validation when evidence checksum does not match provenance entry', () => {
    const tamperedItem: EvidenceItem = {
      ...dummyItem,
      checksum: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    };

    const report = validateEvidenceCitations([tamperedItem.id], [tamperedItem], [dummyProv]);

    expect(report.isValid).toBe(false);
    expect(report.issues[0].code).toBe('CHECKSUM_MISMATCH');
    expect(report.issues[0].message).toContain('does not match immutable provenance checksum');
  });

  it('warns when AI drafted section has no associated evidence citations', () => {
    const ungroundedReport: IncidentReport = {
      id: 'rep-01',
      incidentId: 'inc-01',
      draftedAt: new Date().toISOString(),
      draftedBy: 'cloud-gemini',
      evidenceRefs: [],
      intelligenceRefs: [],
      governanceRefs: [],
      sections: [
        {
          id: 'sec-1',
          heading: 'Executive Summary',
          body: 'Severe regional infrastructure collapse detected.',
          inferenceSource: 'cloud-gemini',
          humanEdited: false,
        },
      ],
    };

    const report = validateReportCitations(ungroundedReport, [dummyItem], [dummyProv]);

    expect(report.isValid).toBe(true); // Warnings do not make isValid false
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].code).toBe('UNCITED_SECTION');
    expect(report.issues[0].severity).toBe('warning');
  });
});
