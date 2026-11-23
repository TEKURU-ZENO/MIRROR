import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, FileText, CheckCircle2, Tag, Gauge, AlertCircle } from 'lucide-react';
import { db } from '@mirror/sync';
import { generateId, nowISO } from '@mirror/core';
import type { InspectionRecord, EvidenceItem, IncidentReport } from '@mirror/core';
import { extractEntitiesFromInspection } from '@mirror/ai';
import { InspectionCard } from '@/components/inspection/InspectionCard';
import { InspectionForm } from '@/components/inspection/InspectionForm';

function InspectionDetail({
  inspection,
  onCreateReport,
}: {
  inspection: InspectionRecord;
  onCreateReport: () => void;
}) {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);

  useEffect(() => {
    async function fetchEvidence() {
      setLoadingEvidence(true);
      try {
        const items = await db.evidenceItems
          .where('inspectionId')
          .equals(inspection.id)
          .toArray();
        setEvidenceItems(items);
      } finally {
        setLoadingEvidence(false);
      }
    }
    void fetchEvidence();
  }, [inspection.id]);

  const { entities, measurements } = extractEntitiesFromInspection(
    inspection,
    evidenceItems.length > 0 ? evidenceItems : inspection.evidence
  );

  const rows: { label: string; value: string }[] = [
    { label: 'Inspection ID', value: inspection.id },
    { label: 'Asset ID', value: inspection.assetId },
    { label: 'Asset Type', value: inspection.assetType },
    { label: 'Location', value: inspection.locationLabel },
    {
      label: 'Coordinates',
      value: inspection.coordinates
        ? `${inspection.coordinates.lat.toFixed(4)}, ${inspection.coordinates.lng.toFixed(4)}`
        : '—',
    },
    { label: 'Captured At', value: new Date(inspection.capturedAt).toLocaleString() },
    { label: 'Ingested At', value: new Date(inspection.ingestedAt).toLocaleString() },
    { label: 'Incident ID', value: inspection.incidentId },
    { label: 'Inspector ID', value: inspection.inspectorId },
    { label: 'Sync Status', value: inspection.syncStatus },
    { label: 'Evidence Items', value: String(evidenceItems.length || inspection.evidence.length) },
  ];

  return (
    <div className="panel p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-mirror-border">
        <div>
          <h2 className="text-lg font-semibold text-mirror-text font-mono">{inspection.assetId}</h2>
          <p className="text-xs text-mirror-muted mt-0.5">{inspection.locationLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCreateReport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-sm bg-mirror-accent hover:bg-mirror-accent-hover text-white font-medium transition-colors shadow-sm"
        >
          <FileText size={15} />
          Draft Incident Report
        </button>
      </div>

      {/* Extracted Grounded Intelligence Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-mirror-accent" />
          <h3 className="text-sm font-semibold text-mirror-text">
            Grounded Field Findings ({entities.length + measurements.length})
          </h3>
        </div>

        {loadingEvidence ? (
          <p className="text-xs text-mirror-muted">Analyzing evidence...</p>
        ) : entities.length === 0 && measurements.length === 0 ? (
          <p className="text-xs text-mirror-muted italic">
            No defect tags or numeric measurements detected in field notes.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Extracted Defects & Assets */}
            {entities.map((ent) => (
              <div
                key={ent.id}
                className="p-3 rounded-lg border border-mirror-border bg-mirror-surface/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-mirror-accent/10 text-mirror-accent border border-mirror-accent/20">
                    {ent.value}
                  </span>
                  <span className="text-[10px] text-mirror-muted uppercase font-mono tracking-wider">
                    {ent.category}
                  </span>
                </div>
                {ent.contextSnippet && (
                  <p className="text-xs text-mirror-muted line-clamp-2 italic">
                    "{ent.contextSnippet}"
                  </p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-mirror-muted pt-1">
                  <CheckCircle2 size={11} className="text-mirror-success" />
                  <span>Grounded to Evidence #{ent.sourceEvidenceId.slice(0, 8)}…</span>
                </div>
              </div>
            ))}

            {/* Extracted Measurements */}
            {measurements.map((meas, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-mirror-border bg-mirror-surface/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gauge size={13} className="text-mirror-accent" />
                    <span className="text-xs font-semibold text-mirror-text">{meas.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-mirror-accent">
                    {meas.value} {meas.unit}
                  </span>
                </div>
                {meas.contextSnippet && (
                  <p className="text-xs text-mirror-muted line-clamp-1 italic">
                    "{meas.contextSnippet}"
                  </p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-mirror-muted pt-1">
                  <CheckCircle2 size={11} className="text-mirror-success" />
                  <span>Grounded to Evidence #{meas.sourceEvidenceId.slice(0, 8)}…</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata Attributes */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-semibold text-mirror-text flex items-center gap-2">
          <AlertCircle size={15} className="text-mirror-muted" />
          Inspection Metadata
        </h3>
        <dl className="divide-y divide-mirror-border panel p-4">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex py-2 gap-4">
              <dt className="w-36 shrink-0 text-xs text-mirror-muted">{label}</dt>
              <dd className="text-sm text-mirror-text font-mono break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function InspectionPage() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  const loadInspections = useCallback(async () => {
    const all = await db.inspections.toArray();
    all.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    setInspections(all);
  }, []);

  useEffect(() => {
    void loadInspections();
  }, [loadInspections]);

  const handleSaved = useCallback((id: string) => {
    void loadInspections();
    setSelectedId(id);
    setShowForm(false);
  }, [loadInspections]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowForm(false);
  };

  const handleNewInspection = () => {
    setSelectedId(null);
    setShowForm(true);
  };

  const handleCreateReport = async (inspection: InspectionRecord) => {
    const reportId = generateId();
    const evidenceIds = inspection.evidence.map((e) => e.id);

    const draftReport: IncidentReport = {
      id: reportId,
      incidentId: inspection.incidentId,
      draftedAt: nowISO(),
      draftedBy: 'local-on-device',
      evidenceRefs: evidenceIds,
      intelligenceRefs: [],
      governanceRefs: [],
      sections: [
        {
          id: generateId(),
          heading: `Field Assessment: ${inspection.assetType.toUpperCase()} (${inspection.assetId})`,
          body: `Asset ${inspection.assetId} at location ${inspection.locationLabel} inspected. Sync status: ${inspection.syncStatus}. Evidence items collected: ${evidenceIds.length}.`,
          inferenceSource: 'local-on-device',
          confidence: 0.90,
          humanEdited: false,
        },
        {
          id: generateId(),
          heading: 'Damage & Structural Observations',
          body: `Field observations indicate localized structural impact. Initial safety perimeter established. Verified evidence references: ${evidenceIds.join(', ') || 'None attached'}.`,
          inferenceSource: 'deterministic',
          confidence: 0.85,
          humanEdited: false,
        },
      ],
    };

    await db.reports.put(draftReport);

    await db.governanceEvents.add({
      id: generateId(),
      occurredAt: nowISO(),
      actorId: inspection.inspectorId,
      actorType: 'inspector',
      eventType: 'report-drafted',
      payload: { reportId, incidentId: inspection.incidentId, inspectionId: inspection.id },
    });

    navigate('/reports');
  };

  const selectedInspection = inspections.find((i) => i.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-56px)] -m-6 overflow-hidden">
      {/* Left panel: inspection list */}
      <aside className="w-80 shrink-0 flex flex-col border-r border-mirror-border bg-mirror-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-mirror-border">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-mirror-accent" />
            <span className="text-sm font-medium text-mirror-text">Inspections</span>
            {inspections.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-mirror-accent/15 text-mirror-accent font-mono">
                {inspections.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleNewInspection}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-mirror-accent border border-mirror-accent/40 hover:bg-mirror-accent/10 transition-colors"
          >
            <Plus size={12} />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-mirror-muted text-xs py-10">
              <ClipboardList size={28} className="mb-2 opacity-30" />
              <p>No inspections yet.</p>
              <p className="mt-1 opacity-70">Click <strong>New</strong> to start.</p>
            </div>
          ) : (
            inspections.map((insp) => (
              <InspectionCard
                key={insp.id}
                inspection={insp}
                selected={selectedId === insp.id}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 overflow-y-auto p-6">
        {showForm || (!selectedId && !showForm) ? (
          <div>
            <div className="mb-5">
              <h1 className="text-xl font-semibold text-mirror-text">New Inspection</h1>
              <p className="text-sm text-mirror-muted mt-0.5">
                Record a field observation for an infrastructure asset.
              </p>
            </div>
            <InspectionForm onSaved={handleSaved} />
          </div>
        ) : selectedInspection ? (
          <div>
            <div className="mb-5">
              <h1 className="text-xl font-semibold text-mirror-text">Inspection Detail</h1>
              <p className="text-sm text-mirror-muted mt-0.5">
                Full record and grounded intelligence findings.
              </p>
            </div>
            <InspectionDetail
              inspection={selectedInspection}
              onCreateReport={() => void handleCreateReport(selectedInspection)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-mirror-muted text-sm">
            <ClipboardList size={36} className="mb-3 opacity-20" />
            <p>Select an inspection from the list or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}
