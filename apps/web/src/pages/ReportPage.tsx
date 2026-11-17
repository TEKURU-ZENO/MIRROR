// MIRROR — ReportPage
// Main report view: conflict resolution + report editing + export/approval.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@mirror/sync';
import { generateId, nowISO } from '@mirror/core';
import type {
  Incident,
  IncidentReport,
  InspectionRecord,
  IntelligenceRecord,
  CrossInspectionAssessment,
  ReportSection,
} from '@mirror/core';
import { ConflictResolutionPanel } from '@/components/report/ConflictResolutionPanel';
import { ReportEditor } from '@/components/report/ReportEditor';
import { ReportExporter } from '@/components/report/ReportExporter';
import { FileBarChart2, AlertTriangle, RefreshCw } from 'lucide-react';

export function ReportPage() {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceRecord[]>([]);
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [incidents, insp, intel, reports] = await Promise.all([
        db.incidents.toArray(),
        db.inspections.toArray(),
        db.intelligence.toArray(),
        db.reports.toArray(),
      ]);
      const firstIncident = incidents[0] ?? null;
      setIncident(firstIncident);
      setInspections(insp);
      setIntelligence(intel);
      // Find most recent report for this incident
      if (firstIncident) {
        const existing = reports
          .filter((r) => r.incidentId === firstIncident.id)
          .sort((a, b) => b.draftedAt.localeCompare(a.draftedAt))[0] ?? null;
        setReport(existing);
      } else {
        // No incident — pick most recent report overall
        const existing = reports.sort((a, b) => b.draftedAt.localeCompare(a.draftedAt))[0] ?? null;
        setReport(existing);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleGenerateDraft = useCallback(async () => {
    setGenerating(true);
    try {
      const incidentId = incident?.id ?? 'unknown';
      const evidenceRefs: string[] = [];
      const intelligenceRefs: string[] = [];

      // Gather evidence refs from all inspections
      for (const insp of inspections) {
        for (const ev of insp.evidence) evidenceRefs.push(ev.id);
      }

      // Look for CrossInspectionAssessment records
      const assessments = intelligence.filter(
        (r) => (r.content as { kind: string }).kind === 'cross-inspection-assessment',
      );

      let sections: ReportSection[];

      if (assessments.length > 0) {
        // Build one section per assessment
        sections = assessments.map((rec) => {
          const content = rec.content as CrossInspectionAssessment;
          intelligenceRefs.push(rec.id);
          return {
            id: generateId(),
            heading: `Cross-Inspection Assessment — Damage: ${content.overallDamageLevel}`,
            body: content.summary,
            inferenceSource: rec.inferenceSource,
            confidence: rec.confidence,
            humanEdited: false,
          };
        });
      } else {
        // Fallback: one section per inspection
        sections = inspections.map((insp) => ({
          id: generateId(),
          heading: `Inspection: ${insp.assetType} at ${insp.locationLabel}`,
          body: [
            `Asset ID: ${insp.assetId}`,
            `Location: ${insp.locationLabel}`,
            `Captured: ${new Date(insp.capturedAt).toLocaleString()}`,
            `Evidence items: ${insp.evidence.length}`,
          ].join('\n'),
          inferenceSource: 'deterministic' as const,
          confidence: 1,
          humanEdited: false,
        }));
      }

      if (sections.length === 0) {
        sections = [
          {
            id: generateId(),
            heading: 'General Assessment',
            body: 'No inspection data available. Please add inspections before generating a report.',
            inferenceSource: 'deterministic' as const,
            confidence: 1,
            humanEdited: false,
          },
        ];
      }

      const draft: IncidentReport = {
        id: generateId(),
        incidentId,
        draftedAt: nowISO(),
        draftedBy: assessments.length > 0 ? assessments[0].inferenceSource : 'deterministic',
        sections,
        evidenceRefs: [...new Set(evidenceRefs)],
        intelligenceRefs: [...new Set(intelligenceRefs)],
        governanceRefs: [],
      };

      await db.reports.put(draft);
      setReport(draft);
    } finally {
      setGenerating(false);
    }
  }, [incident, inspections, intelligence]);

  const handleSaveReport = useCallback(async (updated: IncidentReport) => {
    await db.reports.put(updated);
    setReport(updated);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileBarChart2 size={22} className="text-mirror-accent" />
          <div>
            <h1 className="text-lg font-semibold text-mirror-text">
              {incident?.title ?? 'Incident Report'}
            </h1>
            {incident && (
              <p className="text-xs text-mirror-muted">
                {incident.affectedArea} · {new Date(incident.occurredAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => void handleGenerateDraft()}
          disabled={generating || loading}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium bg-mirror-accent text-white hover:bg-mirror-accent/90 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generating…' : 'Generate Draft Report'}
        </button>
      </div>

      {/* Engineer Review callout */}
      <div className="border border-mirror-warning/50 bg-mirror-warning/5 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-mirror-warning shrink-0 mt-0.5" />
        <p className="text-sm text-mirror-warning leading-snug">
          <span className="font-semibold">MIRROR generates assessment drafts only.</span> All reports
          require qualified engineer review and approval before operational use. MIRROR does not
          certify structural safety.
        </p>
      </div>

      {loading ? (
        <div className="text-mirror-muted text-sm animate-pulse">Loading data…</div>
      ) : (
        <>
          {/* Conflict resolution */}
          <section>
            <ConflictResolutionPanel />
          </section>

          {/* Editor + Exporter side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReportEditor report={report} onSave={handleSaveReport} />
            </div>
            <div className="lg:col-span-1">
              <ReportExporter report={report} incident={incident} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
