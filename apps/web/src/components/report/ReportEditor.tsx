// MIRROR — ReportEditor
// Displays editable report sections. Each section is a textarea.
// Marks sections as humanEdited when the user modifies them.
// Performs real-time cryptographic citation validation against Plane 1 & 3 records.

import { useState, useCallback, useEffect } from 'react';
import type { IncidentReport, ReportSection, EvidenceItem, Provenance } from '@mirror/core';
import { db } from '@mirror/sync';
import { validateReportCitations, type CitationValidationReport } from '@mirror/ai';
import { IntelligenceTrace } from '@/components/intelligence/IntelligenceTrace';
import { nowISO } from '@mirror/core';
import { FileText, ShieldCheck, AlertTriangle, Link2 } from 'lucide-react';

interface ReportEditorProps {
  report: IncidentReport | null;
  onSave: (report: IncidentReport) => void;
}

export function ReportEditor({ report, onSave }: ReportEditorProps) {
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [provenanceRecords, setProvenanceRecords] = useState<Provenance[]>([]);
  const [validation, setValidation] = useState<CitationValidationReport | null>(null);

  useEffect(() => {
    setSections(report?.sections ?? []);
  }, [report]);

  useEffect(() => {
    async function loadValidationData() {
      const [evidence, prov] = await Promise.all([
        db.evidenceItems.toArray(),
        db.provenance.toArray(),
      ]);
      setEvidenceItems(evidence);
      setProvenanceRecords(prov);
    }
    void loadValidationData();
  }, []);

  useEffect(() => {
    if (report && evidenceItems.length > 0) {
      const res = validateReportCitations(report, evidenceItems, provenanceRecords);
      setValidation(res);
    } else {
      setValidation(null);
    }
  }, [report, evidenceItems, provenanceRecords]);

  const handleChange = useCallback((id: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, body: value, humanEdited: true } : s)),
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!report) return;
    onSave({ ...report, sections, reviewedAt: nowISO(), reviewedBy: 'engineer-demo' });
  }, [report, sections, onSave]);

  if (!report) {
    return (
      <div className="panel p-6 text-center text-mirror-muted text-sm flex flex-col items-center gap-2">
        <FileText size={24} className="opacity-40" />
        No report yet. Generate one from the button above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live Citation Integrity Card */}
      {validation && (
        <div
          className={`panel p-4 border transition-colors ${
            validation.isValid && validation.brokenCount === 0
              ? 'border-mirror-success/40 bg-mirror-success/5'
              : 'border-mirror-warning/40 bg-mirror-warning/5'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {validation.isValid && validation.brokenCount === 0 ? (
                <ShieldCheck size={18} className="text-mirror-success shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-mirror-warning shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-mirror-text">
                  Evidence Citation Grounding: {Math.round(validation.integrityScore * 100)}% Integrity
                </p>
                <p className="text-xs text-mirror-muted mt-0.5">
                  {validation.verifiedCount} of {validation.totalCitations} cited evidence records cryptographically verified against Plane 3 SHA-256 provenance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-mirror-surface border border-mirror-border text-[11px] font-mono text-mirror-muted">
              <Link2 size={12} />
              <span>{report.evidenceRefs.length} Linked Refs</span>
            </div>
          </div>

          {validation.issues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-mirror-border/60 space-y-1">
              {validation.issues.map((issue, idx) => (
                <p key={idx} className="text-xs text-mirror-warning flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>{issue.message}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-mirror-text">Report Sections</h3>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 rounded text-xs font-medium bg-mirror-accent/20 text-mirror-accent hover:bg-mirror-accent/30 transition-colors"
        >
          Save Changes
        </button>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="panel p-4 space-y-3">
          {/* Heading */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-mirror-text">{section.heading}</p>
            {section.humanEdited && (
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-mirror-accent/10 text-mirror-accent">
                Edited
              </span>
            )}
          </div>

          {/* Intelligence trace badge */}
          <IntelligenceTrace
            source={section.inferenceSource}
            confidence={section.confidence ?? 0}
            createdAt={report.draftedAt}
          />

          {/* Body textarea */}
          <textarea
            value={section.body}
            onChange={(e) => handleChange(section.id, e.target.value)}
            rows={4}
            className="w-full bg-mirror-surface border border-mirror-border rounded p-2.5 text-xs text-mirror-text font-mono resize-y focus:outline-none focus:border-mirror-accent leading-relaxed"
          />
        </div>
      ))}
    </div>
  );
}
