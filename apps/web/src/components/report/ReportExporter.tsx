// MIRROR — ReportExporter
// Provides Export as Markdown, Copy to Clipboard, and Approve & Lock actions.

import { useState, useCallback } from 'react';
import type { IncidentReport, Incident } from '@mirror/core';
import { nowISO } from '@mirror/core';
import { db } from '@mirror/sync';
import { Download, Clipboard, Lock, AlertTriangle } from 'lucide-react';

interface ReportExporterProps {
  report: IncidentReport | null;
  incident: Incident | null;
}

const DISCLAIMER =
  'This report is for assessment support only. Structural safety determination requires qualified engineering judgment.';

function buildMarkdown(report: IncidentReport, incident: Incident | null): string {
  const lines: string[] = [
    '# MIRROR Incident Report',
    '',
    `**Incident:** ${incident?.title ?? report.incidentId}`,
    `**Date:** ${new Date(report.draftedAt).toLocaleString()}`,
    `**Engineer:** Reviewed by Engineer [Demo]`,
    `**Drafted by:** ${report.draftedBy}`,
    '',
    `> ⚠ ${DISCLAIMER}`,
    '',
    '---',
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.heading}`);
    lines.push('');
    lines.push(section.body);
    lines.push('');
    if (section.confidence !== undefined) {
      lines.push(`*Confidence: ${Math.round(section.confidence * 100)}% — Source: ${section.inferenceSource}*`);
      lines.push('');
    }
  }

  if (report.evidenceRefs.length > 0) {
    lines.push('## Evidence References');
    lines.push('');
    report.evidenceRefs.forEach((ref) => lines.push(`- ${ref}`));
    lines.push('');
  }

  if (report.intelligenceRefs.length > 0) {
    lines.push('## Intelligence References');
    lines.push('');
    report.intelligenceRefs.forEach((ref) => lines.push(`- ${ref}`));
    lines.push('');
  }

  if (report.approvedAt) {
    lines.push('---');
    lines.push('');
    lines.push(`*Approved at ${new Date(report.approvedAt).toLocaleString()} by ${report.approvedBy ?? 'unknown'}*`);
    lines.push('');
  }

  return lines.join('\n');
}

export function ReportExporter({ report, incident }: ReportExporterProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

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
    a.download = `mirror-report-${report.incidentId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, incident]);

  const handleCopy = useCallback(async () => {
    if (!report) return;
    const md = buildMarkdown(report, incident);
    await navigator.clipboard.writeText(md);
    showToast('Copied to clipboard!');
  }, [report, incident, showToast]);

  const handleApprove = useCallback(async () => {
    if (!report) return;
    setApproving(true);
    try {
      const updated: IncidentReport = {
        ...report,
        approvedAt: nowISO(),
        approvedBy: 'engineer-demo',
      };
      await db.reports.put(updated);
      showToast('Report approved and locked.');
    } finally {
      setApproving(false);
    }
  }, [report, showToast]);

  return (
    <div className="panel p-4 space-y-4">
      <h3 className="text-sm font-semibold text-mirror-text">Export & Approve</h3>

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
          onClick={() => void handleApprove()}
          disabled={!report || approving || Boolean(report?.approvedAt)}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-mirror-success/20 text-mirror-success hover:bg-mirror-success/30 disabled:opacity-40 transition-colors"
        >
          <Lock size={13} />
          {report?.approvedAt ? 'Approved ✓' : approving ? 'Approving…' : 'Approve & Lock'}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-mirror-warning">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>{DISCLAIMER}</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="text-xs text-mirror-success bg-mirror-success/10 border border-mirror-success/30 rounded px-3 py-2 transition-opacity">
          {toast}
        </div>
      )}
    </div>
  );
}
