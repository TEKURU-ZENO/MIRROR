// EvidenceVaultPage.tsx — full Evidence Vault page with ingest modal and filter bar

import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowDown, X } from 'lucide-react';
import { db } from '@mirror/sync';
import type { EvidenceItem } from '@mirror/core';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { FileDropZone } from '@/components/evidence/FileDropZone';

type FilterType = 'all' | EvidenceItem['type'];

const FILTER_OPTIONS: FilterType[] = ['all', 'photo', 'pdf', 'note', 'measurement', 'video'];

export function EvidenceVaultPage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const loadEvidence = useCallback(async () => {
    const all = await db.evidenceItems.toArray();
    setEvidence(all);
  }, []);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const handleIngestComplete = useCallback(() => {
    setModalOpen(false);
    void loadEvidence();
  }, [loadEvidence]);

  const filtered =
    filter === 'all' ? evidence : evidence.filter((e) => e.type === filter);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-mirror-text">Evidence Vault</h1>
          <span className="badge-local text-xs font-mono px-2 py-0.5 rounded-full">
            {evidence.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-mirror-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Ingest New Evidence
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setFilter(opt)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
              filter === opt
                ? 'bg-mirror-accent text-white border-mirror-accent'
                : 'border-mirror-border text-mirror-muted hover:border-mirror-accent/60 hover:text-mirror-text',
            ].join(' ')}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="panel p-10 flex flex-col items-center gap-4 text-center">
          <p className="text-mirror-muted text-sm">No evidence found.</p>
          {filter !== 'all' ? (
            <p className="text-xs text-mirror-muted">
              Try switching the filter to <strong>all</strong>.
            </p>
          ) : (
            <>
              <p className="text-xs text-mirror-muted">
                Use the button above to ingest your first file.
              </p>
              <ArrowDown className="w-5 h-5 text-mirror-accent animate-bounce" style={{ transform: 'rotate(180deg)' }} />
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-md bg-mirror-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Ingest New Evidence
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <div className="bg-mirror-surface rounded-xl border border-mirror-border w-full max-w-lg flex flex-col gap-0 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-mirror-border">
              <h2 className="text-base font-semibold text-mirror-text">Ingest New Evidence</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="text-mirror-muted hover:text-mirror-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal body */}
            <div className="px-6 py-5">
              <FileDropZone
                inspectionId={null}
                onComplete={handleIngestComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
