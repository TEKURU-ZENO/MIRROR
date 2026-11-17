// MIRROR — ReportEditor
// Displays editable report sections. Each section is a textarea.
// Marks sections as humanEdited when the user modifies them.

import { useState, useCallback, useEffect } from 'react';
import type { IncidentReport, ReportSection } from '@mirror/core';
import { IntelligenceTrace } from '@/components/intelligence/IntelligenceTrace';
import { nowISO } from '@mirror/core';
import { FileText } from 'lucide-react';

interface ReportEditorProps {
  report: IncidentReport | null;
  onSave: (report: IncidentReport) => void;
}

export function ReportEditor({ report, onSave }: ReportEditorProps) {
  const [sections, setSections] = useState<ReportSection[]>([]);

  useEffect(() => {
    setSections(report?.sections ?? []);
  }, [report]);

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
            rows={4}
            className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder:text-mirror-muted focus:outline-none focus:border-mirror-accent resize-none"
            value={section.body}
            onChange={(e) => handleChange(section.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
