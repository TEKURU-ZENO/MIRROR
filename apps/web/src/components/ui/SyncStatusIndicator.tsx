// SyncStatusIndicator — shows the current sync state of any entity
// Used in evidence cards, inspection headers, and the status bar.

import { clsx } from 'clsx';
import type { SyncStatus } from '@mirror/core';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  showLabel?: boolean;
  className?: string;
}

const CONFIG: Record<SyncStatus, { dot: string; label: string }> = {
  'synced':       { dot: 'sync-dot-synced',   label: 'Synced'       },
  'pending-sync': { dot: 'sync-dot-pending',  label: 'Pending sync' },
  'local-only':   { dot: 'sync-dot-local',    label: 'Local only'   },
  'conflict':     { dot: 'sync-dot-conflict', label: 'Conflict'     },
};

export function SyncStatusIndicator({ status, showLabel = false, className }: SyncStatusIndicatorProps) {
  const { dot, label } = CONFIG[status];
  return (
    <div className={clsx('flex items-center gap-1.5', className)} title={label}>
      <div className={dot} />
      {showLabel && <span className="text-xs text-mirror-muted">{label}</span>}
    </div>
  );
}
