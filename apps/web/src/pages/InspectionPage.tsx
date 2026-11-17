import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, AlertTriangle } from 'lucide-react';
import { db } from '@mirror/sync';
import type { InspectionRecord } from '@mirror/core';
import { InspectionCard } from '@/components/inspection/InspectionCard';
import { InspectionForm } from '@/components/inspection/InspectionForm';

function InspectionDetail({ inspection, onCreateReport }: {
  inspection: InspectionRecord;
  onCreateReport: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'Inspection ID', value: inspection.id },
    { label: 'Asset ID', value: inspection.assetId },
    { label: 'Asset Type', value: inspection.assetType },
    { label: 'Location', value: inspection.locationLabel },
    { label: 'Coordinates', value: inspection.coordinates ? `${inspection.coordinates.lat}, ${inspection.coordinates.lng}` : '—' },
    { label: 'Captured At', value: new Date(inspection.capturedAt).toLocaleString() },
    { label: 'Ingested At', value: new Date(inspection.ingestedAt).toLocaleString() },
    { label: 'Incident ID', value: inspection.incidentId },
    { label: 'Inspector ID', value: inspection.inspectorId },
    { label: 'Sync Status', value: inspection.syncStatus },
    { label: 'Evidence Items', value: String(inspection.evidence.length) },
  ];

  return (
    <div className="panel p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-mirror-text font-mono">{inspection.assetId}</h2>
          <p className="text-xs text-mirror-muted mt-0.5">{inspection.locationLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCreateReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border border-mirror-accent text-mirror-accent hover:bg-mirror-accent/10 transition-colors"
        >
          <AlertTriangle size={14} />
          Create Report
        </button>
      </div>

      <dl className="divide-y divide-mirror-border">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex py-2.5 gap-4">
            <dt className="w-36 shrink-0 text-xs text-mirror-muted">{label}</dt>
            <dd className="text-sm text-mirror-text font-mono break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function InspectionPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  const loadInspections = useCallback(async () => {
    const all = await db.inspections.toArray();
    // Sort newest first
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

  const selectedInspection = inspections.find(i => i.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-56px)] -m-6 overflow-hidden">
      {/* Left panel: inspection list */}
      <aside className="w-80 shrink-0 flex flex-col border-r border-mirror-border bg-mirror-surface overflow-hidden">
        {/* Header */}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-mirror-muted text-xs py-10">
              <ClipboardList size={28} className="mb-2 opacity-30" />
              <p>No inspections yet.</p>
              <p className="mt-1 opacity-70">Click <strong>New</strong> to start.</p>
            </div>
          ) : (
            inspections.map(insp => (
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
              <p className="text-sm text-mirror-muted mt-0.5">Record a field observation for an infrastructure asset.</p>
            </div>
            <InspectionForm onSaved={handleSaved} />
          </div>
        ) : selectedInspection ? (
          <div>
            <div className="mb-5">
              <h1 className="text-xl font-semibold text-mirror-text">Inspection Detail</h1>
              <p className="text-sm text-mirror-muted mt-0.5">Full record for selected inspection.</p>
            </div>
            <InspectionDetail
              inspection={selectedInspection}
              onCreateReport={() => alert('Report generation coming next')}
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
