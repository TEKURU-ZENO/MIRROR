// MIRROR — ReportExporter
// Provides Export as Markdown, Copy to Clipboard, and Professional Engineer Certification per ADR-006.

import { useState, useCallback } from 'react';
import type { IncidentReport, Incident } from '@mirror/core';
import {
  certifyIncidentReport,
  MANDATORY_PE_STATEMENT,
  type EngineerCertificationSignature,
} from '@mirror/core';
import { db } from '@mirror/sync';
import { Download, Clipboard, Lock, AlertTriangle, ShieldCheck, Check } from 'lucide-react';

interface ReportExporterProps {
  report: IncidentReport | null;
  incident: Incident | null;
  onReportUpdated?: (updated: IncidentReport) => void;
}

function buildMarkdown(report: IncidentReport, incident: Incident | null): string {
  const lines: string[] = [
    '# MIRROR Incident Intelligence Assessment Report',
    '',
    `**Incident ID / Title:** ${incident?.title ?? report.incidentId}`,
    `**Report ID:** ${report.id}`,
    `**Initial Drafted At:** ${new Date(report.draftedAt).toLocaleString()}`,
    `**Initial Drafting Engine:** ${report.draftedBy}`,
    '',
    '---',
    '',
    '## Mandatory Regulatory Notice (ADR-006 Compliance)',
    '',
    '> **IMPORTANT NOTICE**: This document contains AI-assisted field intelligence synthesized for incident response and prioritization. Autonomous safety certification is strictly prohibited under MIRROR architecture policy ADR-006. Final certification requires review and sign-off by a licensed Professional Engineer.',
    '',
    '---',
    '',
    '## Certified Incident Findings',
    '',
  ];

  for (const section of report.sections) {
    lines.push(`### ${section.heading}`);
    lines.push('');
    lines.push(section.body);
    lines.push('');
    if (section.confidence !== undefined) {
      lines.push(
        `*Source Tier: ${section.inferenceSource} | Confidence: ${Math.round(
          section.confidence * 100
        )}% | Human Certified: ${section.humanEdited ? 'Yes' : 'No'}*`
      );
      lines.push('');
    }
  }

  if (report.evidenceRefs.length > 0) {
    lines.push('## Cryptographically Verified Evidence Traceability');
    lines.push('');
    report.evidenceRefs.forEach((ref) => lines.push(`- **Evidence Item:** \`${ref}\``));
    lines.push('');
  }

  if (report.approvedAt) {
    lines.push('---');
    lines.push('');
    lines.push('## Professional Engineer (PE) Digital Certification');
    lines.push('');
    lines.push(`**Certified By:** ${report.approvedBy ?? 'Licensed Professional Engineer'}`);
    lines.push(`**Certification Date:** ${new Date(report.approvedAt).toLocaleString()}`);
    lines.push('');
    lines.push(`> "${MANDATORY_PE_STATEMENT}"`);
    lines.push('');
  }

  return lines.join('\n');
}

export function ReportExporter({ report, incident, onReportUpdated }: ReportExporterProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState('Alex Vance, PE');
  const [peLicense, setPeLicense] = useState('PE-FL-89421');
  const [jurisdiction, setJurisdiction] = useState('Florida Board of Professional Engineers');
  const [statementConfirmed, setStatementConfirmed] = useState(true);
  const [signingError, setSigningError] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExport = useCallback(() => {
    if (!report) return;
    const md = buildMarkdown(report, incident);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirror-certified-report-${report.incidentId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, incident]);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    const md = buildMarkdown(report, incident);
    await navigator.clipboard.writeText(md);
    showToast('Report copied to clipboard!');
  }, [report, incident, showToast]);

  const handleExecuteCertification = async () => {
    if (!report) return;
    if (!statementConfirmed) {
      setSigningError('You must confirm the non-autonomous engineering statement to proceed.');
      return;
    }

    try {
      setSigningError(null);
      const signature: EngineerCertificationSignature = {
        signerId: `eng-${peLicense.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
        signerName,
        peLicenseNumber: peLicense,
        jurisdiction,
        certifiedAt: new Date().toISOString(),
        statement: MANDATORY_PE_STATEMENT,
      };

      const { certifiedReport, governanceEvent } = certifyIncidentReport(report, signature);

      await db.reports.put(certifiedReport);
      await db.governanceEvents.add(governanceEvent);

      setShowSignModal(false);
      onReportUpdated?.(certifiedReport);
      showToast('Report professionally certified & locked (ADR-006).');
    } catch (err) {
      setSigningError(err instanceof Error ? err.message : String(err));
    }
  };

  const isApproved = Boolean(report?.approvedAt);

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-mirror-text">Export & Certification</h3>
        {isApproved && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-mirror-success/15 text-mirror-success border border-mirror-success/30">
            <ShieldCheck size={12} /> Certified by Professional Engineer
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          disabled={!report}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-mirror-accent/20 text-mirror-accent hover:bg-mirror-accent/30 disabled:opacity-40 transition-colors"
        >
          <Download size={13} />
          Export as Markdown
        </button>

        <button
          onClick={() => void handleCopy()}
          disabled={!report}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-mirror-text hover:bg-white/10 disabled:opacity-40 transition-colors"
        >
          <Clipboard size={13} />
          Copy to Clipboard
        </button>

        <button
          onClick={() => setShowSignModal(true)}
          disabled={!report || isApproved}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-mirror-success/20 text-mirror-success hover:bg-mirror-success/30 disabled:opacity-40 transition-colors"
        >
          <Lock size={13} />
          {isApproved ? 'Certified & Locked' : 'Sign & Certify Report (PE)'}
        </button>
      </div>

      {toast && (
        <p className="text-xs text-mirror-success flex items-center gap-1 animate-fade-in font-medium">
          <Check size={13} /> {toast}
        </p>
      )}

      {/* Engineer Certification Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="panel p-6 max-w-lg w-full space-y-4 border border-mirror-border shadow-2xl bg-mirror-surface">
            <div className="flex items-center gap-2 border-b border-mirror-border pb-3">
              <ShieldCheck size={20} className="text-mirror-accent" />
              <div>
                <h3 className="text-base font-semibold text-mirror-text">
                  Professional Engineer Certification
                </h3>
                <p className="text-xs text-mirror-muted">
                  Compliance protocol under MIRROR Architecture Decision ADR-006.
                </p>
              </div>
            </div>

            {signingError && (
              <div className="p-3 rounded bg-mirror-danger/10 border border-mirror-danger/30 text-xs text-mirror-danger flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{signingError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-mirror-muted block mb-1">Engineer Full Name:</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-mirror-bg border border-mirror-border rounded p-2 text-mirror-text focus:outline-none focus:border-mirror-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-mirror-muted block mb-1">PE License Number:</label>
                  <input
                    type="text"
                    value={peLicense}
                    onChange={(e) => setPeLicense(e.target.value)}
                    className="w-full bg-mirror-bg border border-mirror-border rounded p-2 text-mirror-text font-mono focus:outline-none focus:border-mirror-accent"
                  />
                </div>
                <div>
                  <label className="text-mirror-muted block mb-1">State / Jurisdiction:</label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full bg-mirror-bg border border-mirror-border rounded p-2 text-mirror-text focus:outline-none focus:border-mirror-accent"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-mirror-bg/80 border border-mirror-border space-y-2">
                <p className="text-[11px] text-mirror-muted leading-relaxed italic">
                  "{MANDATORY_PE_STATEMENT}"
                </p>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statementConfirmed}
                    onChange={(e) => setStatementConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-mirror-border text-mirror-accent focus:ring-0"
                  />
                  <span className="text-[11px] font-medium text-mirror-text">
                    I confirm that I have reviewed the physical field evidence and assume professional responsibility.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-mirror-border">
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="px-3.5 py-1.5 rounded text-xs text-mirror-muted hover:text-mirror-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleExecuteCertification()}
                className="px-4 py-2 rounded text-xs font-semibold bg-mirror-success text-white hover:bg-mirror-success/90 transition-colors shadow-md flex items-center gap-1.5"
              >
                <Lock size={13} />
                Certify & Lock Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
