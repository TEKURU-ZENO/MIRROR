import { Loader, CloudOff, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { SyncState } from '@/hooks/useSyncEngine';

export interface SyncBannerProps {
  syncState: SyncState;
}

export function SyncBanner({ syncState }: SyncBannerProps) {
  const { pending, failed, deadLetter, isSyncing } = syncState;

  // When all done: nothing (banner hidden)
  if (!isSyncing && pending === 0 && failed === 0 && deadLetter === 0) {
    return null;
  }

  // When isSyncing: spinning Loader icon
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

  // When deadLetter > 0: High visibility quarantine notice
  if (deadLetter > 0) {
    return (
      <div className="h-8 px-6 flex items-center gap-2 text-xs bg-rose-500/15 text-rose-400 border-b border-rose-500/30 shrink-0">
        <ShieldAlert size={13} className="shrink-0" />
        <span>
          {deadLetter} record{deadLetter === 1 ? '' : 's'} quarantined in Dead-Letter Queue (exceeded max retries).
        </span>
      </div>
    );
  }

  // When failed > 0: retryable failure notice
  if (failed > 0) {
    return (
      <div className="h-8 px-6 flex items-center gap-2 text-xs bg-amber-500/15 text-amber-400 border-b border-amber-500/30 shrink-0">
        <AlertTriangle size={13} className="shrink-0" />
        <span>
          {failed} record{failed === 1 ? '' : 's'} failed to sync. Will retry automatically.
        </span>
      </div>
    );
  }

  // When pending > 0 and not syncing: CloudOff icon
  if (pending > 0) {
    return (
      <div className="h-8 px-6 flex items-center gap-2 text-xs bg-mirror-warning/15 text-mirror-warning border-b border-mirror-warning/30 shrink-0">
        <CloudOff size={13} className="shrink-0" />
        <span>
          {pending} record{pending === 1 ? '' : 's'} queued locally. Waiting for cloud sync window.
        </span>
      </div>
    );
  }

  return null;
}
