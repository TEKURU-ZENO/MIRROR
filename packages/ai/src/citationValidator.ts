// MIRROR — End-to-End Evidence Citation Validator
// Validates that every factual statement, report section, or AI synthesis output
// traces back to verified, tamper-free evidence items in Plane 1 and Plane 3 provenance records.

import type { EvidenceItem, IncidentReport, Provenance, UUID } from '@mirror/core';

export interface CitationIssue {
  severity: 'error' | 'warning';
  code: 'MISSING_EVIDENCE' | 'CHECKSUM_MISMATCH' | 'ORPHAN_CITATION' | 'UNCITED_SECTION';
  evidenceId?: UUID;
  message: string;
}

export interface CitationValidationReport {
  isValid: boolean;
  totalCitations: number;
  verifiedCount: number;
  brokenCount: number;
  integrityScore: number; // 0.0 to 1.0 (ratio of verified to total)
  issues: CitationIssue[];
  verifiedEvidenceIds: UUID[];
}

/**
 * Validate a set of cited evidence IDs against available evidence records and provenance entries.
 */
export function validateEvidenceCitations(
  citedIds: UUID[],
  evidenceItems: EvidenceItem[],
  provenanceRecords: Provenance[] = []
): CitationValidationReport {
  const evidenceMap = new Map<string, EvidenceItem>(evidenceItems.map((e) => [e.id, e]));
  const provenanceMap = new Map<string, Provenance>(provenanceRecords.map((p) => [p.evidenceId, p]));

  const issues: CitationIssue[] = [];
  const verifiedEvidenceIds: UUID[] = [];

  for (const id of citedIds) {
    const evidence = evidenceMap.get(id);

    // Check 1: Existence in Evidence Plane
    if (!evidence) {
      issues.push({
        severity: 'error',
        code: 'MISSING_EVIDENCE',
        evidenceId: id,
        message: `Cited evidence ID "${id}" does not exist in the Evidence Vault.`,
      });
      continue;
    }

    // Check 2: Cryptographic Provenance Integrity
    const prov = provenanceMap.get(id);
    if (prov) {
      if (prov.checksum !== evidence.checksum) {
        issues.push({
          severity: 'error',
          code: 'CHECKSUM_MISMATCH',
          evidenceId: id,
          message: `Evidence "${id}" checksum ${evidence.checksum.slice(0, 8)}… does not match immutable provenance checksum ${prov.checksum.slice(0, 8)}…`,
        });
        continue;
      }
    }

    verifiedEvidenceIds.push(id);
  }

  const totalCitations = citedIds.length;
  const verifiedCount = verifiedEvidenceIds.length;
  const brokenCount = totalCitations - verifiedCount;
  const integrityScore = totalCitations > 0 ? Number((verifiedCount / totalCitations).toFixed(2)) : 1.0;
  const isValid = issues.filter((i) => i.severity === 'error').length === 0;

  return {
    isValid,
    totalCitations,
    verifiedCount,
    brokenCount,
    integrityScore,
    issues,
    verifiedEvidenceIds,
  };
}

/**
 * Validate an entire IncidentReport for factual citation grounding.
 * Checks that report sections cite evidence and all evidenceRefs are verifiable.
 */
export function validateReportCitations(
  report: IncidentReport,
  availableEvidence: EvidenceItem[],
  provenanceRecords: Provenance[] = []
): CitationValidationReport {
  const baseValidation = validateEvidenceCitations(
    report.evidenceRefs,
    availableEvidence,
    provenanceRecords
  );

  const issues = [...baseValidation.issues];

  // Check section citation hygiene: Ensure AI-generated sections have evidence grounding
  for (const section of report.sections) {
    if (section.inferenceSource !== 'human' && !section.humanEdited) {
      // Look for inline citation indicators or report evidenceRefs
      const hasInlineCitation = /\[(?:EV|evidence)-[a-zA-Z0-9-]+\]/i.test(section.body);
      if (report.evidenceRefs.length === 0 && !hasInlineCitation) {
        issues.push({
          severity: 'warning',
          code: 'UNCITED_SECTION',
          message: `Section "${section.heading}" was drafted by ${section.inferenceSource} without linked evidence citations.`,
        });
      }
    }
  }

  return {
    ...baseValidation,
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}
