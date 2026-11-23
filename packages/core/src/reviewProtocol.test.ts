import { describe, it, expect } from 'vitest';
import {
  validateEngineerCertification,
  certifyIncidentReport,
  MANDATORY_PE_STATEMENT,
  type EngineerCertificationSignature,
} from './reviewProtocol.js';
import type { IncidentReport } from './types.js';

describe('Human-in-the-Loop Review Protocol (ADR-006)', () => {
  const validSignature: EngineerCertificationSignature = {
    signerId: 'eng-007',
    signerName: 'Jane Doe, PE',
    peLicenseNumber: 'PE-CA-987654',
    jurisdiction: 'California Board for Professional Engineers',
    certifiedAt: new Date().toISOString(),
    statement: MANDATORY_PE_STATEMENT,
  };

  const sampleReport: IncidentReport = {
    id: 'rep-test-01',
    incidentId: 'inc-01',
    draftedAt: new Date().toISOString(),
    draftedBy: 'cloud-gemini',
    evidenceRefs: ['ev-1', 'ev-2'],
    intelligenceRefs: [],
    governanceRefs: [],
    sections: [
      {
        id: 'sec-1',
        heading: 'Structural Integrity Assessment',
        body: 'Feeder line snapped at mid-span.',
        inferenceSource: 'cloud-gemini',
        humanEdited: false,
      },
    ],
  };

  it('validates a complete, compliant professional engineer signature', () => {
    const res = validateEngineerCertification(validSignature);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects signature without PE license number [ADR-006]', () => {
    const invalid = { ...validSignature, peLicenseNumber: '' };
    const res = validateEngineerCertification(invalid);

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('License Number'))).toBe(true);
  });

  it('rejects signature if mandatory non-autonomous compliance statement is missing', () => {
    const invalid = { ...validSignature, statement: 'I approve this report.' };
    const res = validateEngineerCertification(invalid);

    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes('ADR-006'))).toBe(true);
  });

  it('certifyIncidentReport binds signature, updates report approvals, and creates governance event', () => {
    const { certifiedReport, governanceEvent } = certifyIncidentReport(sampleReport, validSignature);

    expect(certifiedReport.approvedBy).toBe('eng-007');
    expect(certifiedReport.reviewedBy).toBe('eng-007');
    expect(certifiedReport.approvedAt).toBe(validSignature.certifiedAt);
    expect(certifiedReport.sections[0].humanEdited).toBe(true);

    expect(governanceEvent.eventType).toBe('report-approved');
    expect(governanceEvent.actorType).toBe('engineer');
    expect(governanceEvent.actorId).toBe('eng-007');
    expect(governanceEvent.payload.peLicenseNumber).toBe('PE-CA-987654');
    expect(governanceEvent.payload.adr006ComplianceConfirmed).toBe(true);
  });
});
