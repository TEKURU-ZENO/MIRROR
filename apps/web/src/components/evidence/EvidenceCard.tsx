// EvidenceCard.tsx — displays a single EvidenceItem in the vault grid

import { useState } from 'react';
import { Image, FileText, File, Video, Ruler } from 'lucide-react';
import { formatBytes } from '@mirror/core';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';
import { ProvenanceDrawer } from './ProvenanceDrawer';
import type { EvidenceItem } from '@mirror/core';

interface EvidenceCardProps {
  item: EvidenceItem;
}

function EvidenceTypeIcon({ type }: { type: EvidenceItem['type'] }) {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'photo':       return <Image className={`${cls} text-mirror-accent`} />;
    case 'pdf':         return <FileText className={`${cls} text-mirror-warning`} />;
    case 'video':       return <Video className={`${cls} text-mirror-success`} />;
    case 'measurement': return <Ruler className={`${cls} text-mirror-muted`} />;
    case 'note':        return <File className={`${cls} text-mirror-muted`} />;
  }
}

export function EvidenceCard({ item }: EvidenceCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="panel p-4 text-left flex flex-col gap-3 hover:border-mirror-accent/60 transition-colors cursor-pointer w-full"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <EvidenceTypeIcon type={item.type} />
            <span className="text-xs font-medium text-mirror-muted uppercase tracking-wide">
              {item.type}
            </span>
          </div>
          <SyncStatusIndicator status="local-only" showLabel={false} />
        </div>

        {/* Filename */}
        <p className="text-sm font-semibold text-mirror-text truncate leading-tight">
          {item.filename ?? '(no filename)'}
        </p>

        {/* Meta */}
        <div className="flex flex-col gap-1">
          {item.sizeBytes !== undefined && (
            <p className="text-xs text-mirror-muted">{formatBytes(item.sizeBytes)}</p>
          )}
          <p className="text-xs text-mirror-muted">
            {new Date(item.capturedAt).toLocaleString()}
          </p>
        </div>

        {/* Field notes (truncated) */}
        {item.fieldNotes && (
          <p className="text-xs text-mirror-muted line-clamp-2 italic">"{item.fieldNotes}"</p>
        )}

        {/* Checksum preview */}
        <p className="text-[10px] font-mono text-mirror-muted/70 tracking-tight">
          sha256: {item.checksum.slice(0, 12)}…
        </p>
      </button>

      {drawerOpen && (
        <ProvenanceDrawer item={item} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
