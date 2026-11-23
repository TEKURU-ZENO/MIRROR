// MIRROR — Human-in-the-Loop Review & Engineering Certification Protocol
// Enforces ADR-006 (Non-Negotiable Architecture Decision):
// "MIRROR never autonomously certifies structural safety. AI outputs are decision-support only.
// Every safety-critical assessment requires a certified engineer's digital signature and audit trail."

import type { UUID, ISOTimestamp, IncidentReport, GovernanceEvent } from './types.js';
import { generateId, nowISO } from './utils.js';

export const MANDATORY_PE_STATEMENT =
  'I hereby certify that I have reviewed the underlying physical evidence, raw field observations, and AI decision-support synthesis for this incident report. I confirm that the structural risk assessments and recommended repairs comply with applicable engineering safety standards, and I assume professional responsibility for this assessment. AI outputs served solely as decision-support heuristics.';

export interface EngineerCertificationSignature {
  signerId: UUID;
  signerName: string;
  peLicenseNumber: string; // Professional Engineer license number
  jurisdiction: string;    // Licensing state/board (e.g., "State of California", "FDOT")
  certifiedAt: ISOTimestamp;
  statement: string;
}

export interface CertificationValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate that an engineer's certification signature satisfies regulatory safety requirements.
 */
export function validateEngineerCertification(
  cert: EngineerCertificationSignature
): CertificationValidationResult {
  const errors: string[] = [];

  if (!cert.signerName || cert.signerName.trim().length < 3) {
    errors.push('Signer name must be provided (minimum 3 characters).');
  }

  if (!cert.peLicenseNumber || cert.peLicenseNumber.trim().length < 4) {
    errors.push('A valid Professional Engineer (PE) License Number is required to certify safety reports.');
  }

  if (!cert.jurisdiction || cert.jurisdiction.trim().length < 2) {
    errors.push('Engineering licensing jurisdiction must be specified.');
  }

  if (!cert.statement || !cert.statement.includes('decision-support')) {
    errors.push('Mandatory ADR-006 compliance statement affirming non-autonomous AI review is missing.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Apply professional engineering certification to an IncidentReport,
 * binding the signature and emitting an immutable GovernanceEvent in Plane 3.
 */
export function certifyIncidentReport(
  report: IncidentReport,
  cert: EngineerCertificationSignature
): {
  certifiedReport: IncidentReport;
  governanceEvent: GovernanceEvent;
} {
  const validation = validateEngineerCertification(cert);
  if (!validation.isValid) {
    throw new Error(`Certification rejected: ${validation.errors.join('; ')}`);
  }

  const timestamp = cert.certifiedAt || nowISO();

  // Mark all sections reviewed
  const reviewedSections = report.sections.map((sec) => ({
    ...sec,
    humanEdited: true, // Certified human sign-off
  }));

  const certifiedReport: IncidentReport = {
    ...report,
    reviewedAt: timestamp,
    reviewedBy: cert.signerId,
    approvedAt: timestamp,
    approvedBy: cert.signerId,
    sections: reviewedSections,
  };

  const governanceEvent: GovernanceEvent = {
    id: generateId(),
    occurredAt: timestamp,
    actorId: cert.signerId,
    actorType: 'engineer',
    eventType: 'report-approved',
    payload: {
      reportId: report.id,
      incidentId: report.incidentId,
      signerName: cert.signerName,
      peLicenseNumber: cert.peLicenseNumber,
      jurisdiction: cert.jurisdiction,
      adr006ComplianceConfirmed: true,
      certifiedEvidenceRefsCount: report.evidenceRefs.length,
    },
  };

  return {
    certifiedReport,
    governanceEvent,
  };
}
