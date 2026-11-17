import { clsx } from 'clsx';
import { MapPin, Layers, Image } from 'lucide-react';
import type { InspectionRecord } from '@mirror/core';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

interface InspectionCardProps {
  inspection: InspectionRecord;
  selected: boolean;
  onSelect: (id: string) => void;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  'power-line': 'Power Line',
  'transformer': 'Transformer',
  'pole': 'Pole',
  'substation': 'Substation',
  'bridge': 'Bridge',
  'road': 'Road',
  'pipeline': 'Pipeline',
  'other': 'Other',
};

export function InspectionCard({ inspection, selected, onSelect }: InspectionCardProps) {
  const capturedDate = new Date(inspection.capturedAt).toLocaleString();

  return (
    <button
      type="button"
      onClick={() => onSelect(inspection.id)}
      className={clsx(
        'w-full text-left panel p-3 rounded-lg border transition-colors cursor-pointer',
        selected
          ? 'border-mirror-accent bg-mirror-accent/5'
          : 'border-mirror-border hover:border-mirror-accent/40 hover:bg-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono font-bold text-mirror-text text-sm truncate">
          {inspection.assetId}
        </span>
        <SyncStatusIndicator status={inspection.syncStatus} />
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-mirror-accent/15 text-mirror-accent">
          <Layers size={10} />
          {ASSET_TYPE_LABELS[inspection.assetType] ?? inspection.assetType}
        </span>
        {inspection.evidence.length > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-mirror-muted">
            <Image size={10} />
            {inspection.evidence.length} item{inspection.evidence.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-mirror-muted mb-1">
        <MapPin size={11} />
        <span className="truncate">{inspection.locationLabel}</span>
      </div>

      <div className="text-[10px] text-mirror-muted font-mono">{capturedDate}</div>
    </button>
  );
}
