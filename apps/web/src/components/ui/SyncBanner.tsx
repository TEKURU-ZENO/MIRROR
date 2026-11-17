import { Loader, CloudOff, AlertTriangle } from 'lucide-react';

export interface SyncState {
  pending: number;
  failed: number;
  done: number;
  lastSync?: string;
  isSyncing: boolean;
}

export interface SyncBannerProps {
  syncState: SyncState;
}

export function SyncBanner({ syncState }: SyncBannerProps) {
  const { pending, failed, isSyncing } = syncState;

  // When all done: nothing (banner hidden)
  if (!isSyncing && pending === 0 && failed === 0) {
    return null;
  }

  // When isSyncing: "Synchronising {pending} records to cloud…" with a spinning Loader icon (lucide)
  if (isSyncing) {
    return (
      <div className="h-8 px-6 flex items-center gap-2 text-xs bg-mirror-accent/15 text-mirror-accent border-b border-mirror-accent/30 shrink-0">
        <Loader size={13} className="animate-spin shrink-0" />
        <span>
          Synchronising {pending} record{pending === 1 ? '' : 's'} to cloud…
        </span>
      </div>
    );
  }

  // When failed > 0: "X records failed to sync." with AlertTriangle icon (amber)
  if (failed > 0) {
    return (
      <div className="h-8 px-6 flex items-center gap-2 text-xs bg-amber-500/15 text-amber-400 border-b border-amber-500/30 shrink-0">
        <AlertTriangle size={13} className="shrink-0" />
        <span>
          {failed} record{failed === 1 ? '' : 's'} failed to sync.
        </span>
      </div>
    );
  }

  // When pending > 0 and not syncing: "X records pending sync. Waiting for connectivity." with a CloudOff icon
  if (pending > 0) {
    return (
      <div className="h-8 px-6 flex items-center gap-2 text-xs bg-mirror-warning/15 text-mirror-warning border-b border-mirror-warning/30 shrink-0">
        <CloudOff size={13} className="shrink-0" />
        <span>
          {pending} record{pending === 1 ? '' : 's'} pending sync. Waiting for connectivity.
        </span>
      </div>
    );
  }

  return null;
}
