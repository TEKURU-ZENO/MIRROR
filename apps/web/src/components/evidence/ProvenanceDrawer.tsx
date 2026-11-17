// ProvenanceDrawer.tsx — right-side slide-in panel showing full provenance chain

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '@mirror/sync';
import type { EvidenceItem, Provenance } from '@mirror/core';

interface ProvenanceDrawerProps {
  item: EvidenceItem;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-mirror-muted">
        {label}
      </span>
      <span className="text-xs font-mono text-mirror-text break-all">{value}</span>
    </div>
  );
}

export function ProvenanceDrawer({ item, onClose }: ProvenanceDrawerProps) {
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    db.provenance.get(item.id).then((p) => {
      if (!cancelled) {
        setProvenance(p ?? null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [item.id]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Evidence Provenance"
        className="fixed right-0 top-0 h-full w-96 bg-mirror-surface border-l border-mirror-border z-50 flex flex-col shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mirror-border shrink-0">
          <h2 className="text-sm font-semibold text-mirror-text">Provenance Chain</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="text-mirror-muted hover:text-mirror-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          {/* Evidence section */}
          <section>
            <h3 className="text-xs font-semibold text-mirror-accent uppercase tracking-widest mb-3">
              Evidence Item
            </h3>
            <div className="flex flex-col gap-3">
              <Row label="ID" value={item.id} />
              <Row label="Type" value={item.type} />
              {item.filename && <Row label="Filename" value={item.filename} />}
              <Row label="Checksum (SHA-256)" value={item.checksum} />
              <Row label="Captured At" value={new Date(item.capturedAt).toLocaleString()} />
              <Row label="Ingested At" value={new Date(item.ingestedAt).toLocaleString()} />
              <Row label="Storage Ref" value={item.storageRef} />
              {item.fieldNotes && <Row label="Field Notes" value={item.fieldNotes} />}
            </div>
          </section>

          <div className="border-t border-mirror-border" />

          {/* Provenance section */}
          <section>
            <h3 className="text-xs font-semibold text-mirror-accent uppercase tracking-widest mb-3">
              Provenance Record
            </h3>
            {loading ? (
              <p className="text-xs text-mirror-muted">Loading…</p>
            ) : provenance ? (
              <div className="flex flex-col gap-3">
                <Row label="Captured By" value={provenance.capturedBy} />
                <Row label="Captured At" value={new Date(provenance.capturedAt).toLocaleString()} />
                <Row label="Ingested At" value={new Date(provenance.ingestedAt).toLocaleString()} />
                <Row label="Ingested On Device" value={provenance.ingestedOnDevice} />
                <Row
                  label="Governance Events"
                  value={`${provenance.governanceEventIds.length} event${provenance.governanceEventIds.length !== 1 ? 's' : ''}`}
                />
              </div>
            ) : (
              <p className="text-xs text-mirror-muted italic">No provenance record found.</p>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
