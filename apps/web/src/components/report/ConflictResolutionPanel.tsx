// MIRROR — ConflictResolutionPanel
// Shows all ConflictFlag intelligence records. Allows engineer or inspector to
// choose an explicit resolution strategy ('keep-local', 'keep-remote', 'fork-both') per ADR-005.

import { useState, useEffect, useCallback } from 'react';
import { db, resolveConflict, type ConflictResolutionStrategy } from '@mirror/sync';
import type { IntelligenceRecord, ConflictFlag } from '@mirror/core';
import { AlertTriangle, CheckCircle, GitFork, Check } from 'lucide-react';

interface ConflictRecord {
  record: IntelligenceRecord;
  content: ConflictFlag;
}

export function ConflictResolutionPanel() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const loadConflicts = useCallback(async () => {
    const all = await db.intelligence.toArray();
    const flags: ConflictRecord[] = all
      .filter((r) => (r.content as { kind: string }).kind === 'conflict-flag')
      .map((r) => ({ record: r, content: r.content as ConflictFlag }));
    setConflicts(flags);

    const pre: Record<string, string> = {};
    flags.forEach(({ record, content }) => {
      if (content.resolution) pre[record.id] = content.resolution;
    });
    setResolutions((prev) => ({ ...pre, ...prev }));
  }, []);

  useEffect(() => {
    void loadConflicts();
  }, [loadConflicts]);

  const handleApplyStrategy = useCallback(
    async (recordId: string, strategy: ConflictResolutionStrategy) => {
      setSaving((prev) => ({ ...prev, [recordId]: true }));
      try {
        const rec = conflicts.find((c) => c.record.id === recordId);
        if (!rec) return;

        const entityId = rec.content.conflictingInspectionIds[0] ?? rec.record.inspectionId;
        const localInspection = await db.inspections.get(entityId);

        const justification =
          resolutions[recordId] || `Conflict resolved using ${strategy} protocol by engineer.`;

        await resolveConflict({
          conflictId: recordId,
          entityId,
          entityType: 'inspection',
          strategy,
          actorId: 'engineer-demo',
          actorType: 'engineer',
          justification,
          localData: (localInspection as unknown as Record<string, unknown>) ?? {},
          remoteData: (localInspection as unknown as Record<string, unknown>) ?? {},
        });

        await loadConflicts();
      } finally {
        setSaving((prev) => ({ ...prev, [recordId]: false }));
      }
    },
    [conflicts, resolutions, loadConflicts]
  );

  if (conflicts.length === 0) {
    return (
      <div className="panel p-4 text-mirror-muted text-sm flex items-center gap-2">
        <CheckCircle size={16} className="text-mirror-success" />
        No active conflict flags detected.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-mirror-text flex items-center gap-2">
          <AlertTriangle size={15} className="text-mirror-warning" />
          Conflict Flags ({conflicts.length})
        </h3>
        <span className="text-[11px] text-mirror-muted font-mono">
          ADR-005 Non-Silent Reconciliation
        </span>
      </div>

      {conflicts.map(({ record, content }) => {
        const isResolved = Boolean(content.resolvedAt);
        return (
          <div key={record.id} className="panel p-4 space-y-3 border-l-4 border-l-mirror-warning">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-mirror-muted">
                {record.id.slice(0, 12)}…
              </span>
              {isResolved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-mirror-success/15 text-mirror-success">
                  <CheckCircle size={11} /> Resolved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-mirror-danger/15 text-mirror-danger">
                  <AlertTriangle size={11} /> Requires Review
                </span>
              )}
            </div>

            {/* Conflicting inspections */}
            <div>
              <p className="text-xs text-mirror-muted mb-1">Conflicting Inspections</p>
              <div className="flex flex-wrap gap-1">
                {content.conflictingInspectionIds.map((id) => (
                  <span
                    key={id}
                    className="font-mono text-xs bg-white/5 border border-mirror-border rounded px-1.5 py-0.5 text-mirror-text"
                  >
                    {id.slice(0, 12)}…
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-mirror-text leading-relaxed">{content.description}</p>

            {/* Resolution Strategy Actions */}
            {!isResolved ? (
              <div className="space-y-2 pt-2 border-t border-mirror-border/60">
                <label className="text-xs text-mirror-muted block">
                  Engineer Justification / Field Note:
                </label>
                <input
                  type="text"
                  className="w-full bg-mirror-surface border border-mirror-border rounded px-2.5 py-1.5 text-xs text-mirror-text focus:outline-none focus:border-mirror-accent"
                  placeholder="Optional review note..."
                  value={resolutions[record.id] ?? ''}
                  onChange={(e) =>
                    setResolutions((prev) => ({ ...prev, [record.id]: e.target.value }))
                  }
                />

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => void handleApplyStrategy(record.id, 'keep-local')}
                    disabled={saving[record.id]}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-mirror-accent/15 text-mirror-accent hover:bg-mirror-accent/25 border border-mirror-accent/30 transition-colors disabled:opacity-50"
                  >
                    Keep Local Ground Observation
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleApplyStrategy(record.id, 'keep-remote')}
                    disabled={saving[record.id]}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 transition-colors disabled:opacity-50"
                  >
                    Keep Remote Cloud Record
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleApplyStrategy(record.id, 'fork-both')}
                    disabled={saving[record.id]}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <GitFork size={12} />
                    Fork Both (No Loss)
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-mirror-border/60 text-xs text-mirror-muted space-y-1">
                <p className="text-mirror-success font-medium flex items-center gap-1">
                  <Check size={12} />
                  {content.resolution}
                </p>
                {content.resolvedAt && (
                  <p className="font-mono text-[10px]">
                    Resolved at {new Date(content.resolvedAt).toLocaleString()} by {content.resolvedBy ?? 'engineer'}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
