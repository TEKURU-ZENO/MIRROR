// MIRROR — ConflictResolutionPanel
// Shows all ConflictFlag intelligence records. Allows engineer to enter a
// resolution note and mark each conflict as resolved.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@mirror/sync';
import type { IntelligenceRecord, ConflictFlag } from '@mirror/core';
import { nowISO } from '@mirror/core';
import { AlertTriangle, CheckCircle } from 'lucide-react';

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
    // Pre-fill resolution text for already-resolved entries
    const pre: Record<string, string> = {};
    flags.forEach(({ record, content }) => {
      if (content.resolution) pre[record.id] = content.resolution;
    });
    setResolutions((prev) => ({ ...pre, ...prev }));
  }, []);

  useEffect(() => {
    void loadConflicts();
  }, [loadConflicts]);

  const handleMarkResolved = useCallback(
    async (recordId: string) => {
      setSaving((prev) => ({ ...prev, [recordId]: true }));
      try {
        const rec = conflicts.find((c) => c.record.id === recordId);
        if (!rec) return;
        const updatedContent: ConflictFlag = {
          ...rec.content,
          resolution: resolutions[recordId] ?? '',
          resolvedAt: nowISO(),
          resolvedBy: 'engineer-demo',
        };
        await db.intelligence.update(recordId, { content: updatedContent });
        await loadConflicts();
      } finally {
        setSaving((prev) => ({ ...prev, [recordId]: false }));
      }
    },
    [conflicts, resolutions, loadConflicts],
  );

  if (conflicts.length === 0) {
    return (
      <div className="panel p-4 text-mirror-muted text-sm flex items-center gap-2">
        <CheckCircle size={16} className="text-mirror-success" />
        No conflict flags detected.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-mirror-text flex items-center gap-2">
        <AlertTriangle size={15} className="text-mirror-warning" />
        Conflict Flags ({conflicts.length})
      </h3>

      {conflicts.map(({ record, content }) => {
        const isResolved = Boolean(content.resolvedAt);
        return (
          <div key={record.id} className="panel p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-mirror-muted">
                {record.id.slice(0, 12)}
              </span>
              {isResolved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-mirror-success/15 text-mirror-success">
                  <CheckCircle size={11} /> Resolved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-mirror-danger/15 text-mirror-danger">
                  <AlertTriangle size={11} /> Unresolved
                </span>
              )}
            </div>

            {/* Conflicting inspections */}
            <div>
              <p className="text-xs text-mirror-muted mb-1">Conflicting Inspections</p>
              <div className="flex flex-wrap gap-1">
                {content.conflictingInspectionIds.map((id) => (
                  <span key={id} className="font-mono text-xs bg-white/5 border border-mirror-border rounded px-1.5 py-0.5 text-mirror-text">
                    {id.slice(0, 12)}…
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-mirror-text">{content.description}</p>

            {/* Resolution input */}
            <div className="space-y-2">
              <label className="text-xs text-mirror-muted">Resolution note</label>
              <textarea
                className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder:text-mirror-muted focus:outline-none focus:border-mirror-accent resize-none"
                rows={3}
                placeholder="Describe your resolution…"
                value={resolutions[record.id] ?? ''}
                onChange={(e) =>
                  setResolutions((prev) => ({ ...prev, [record.id]: e.target.value }))
                }
              />
              {isResolved && content.resolvedAt && (
                <p className="text-xs text-mirror-muted">
                  Resolved at {new Date(content.resolvedAt).toLocaleString()} by{' '}
                  {content.resolvedBy ?? 'unknown'}
                </p>
              )}
              <button
                onClick={() => void handleMarkResolved(record.id)}
                disabled={saving[record.id]}
                className="px-3 py-1.5 rounded text-xs font-medium bg-mirror-success/20 text-mirror-success hover:bg-mirror-success/30 disabled:opacity-50 transition-colors"
              >
                {saving[record.id] ? 'Saving…' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
