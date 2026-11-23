// MIRROR Intelligence Trace component
// Renders the source badge, confidence bar, and provenance link
// for every AI-generated output displayed in the UI.
// This component is REQUIRED on every intelligence display surface.

import { clsx } from 'clsx';
import { CONFIDENCE_THRESHOLDS, INFERENCE_SOURCE_LABELS } from '@mirror/core';
import type { InferenceSource } from '@mirror/core';

interface IntelligenceTraceProps {
  source: InferenceSource;
  confidence: number;
  modelVersion?: string;
  createdAt: string;
  mode?: 'real' | 'mock' | 'demo';
  className?: string;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= CONFIDENCE_THRESHOLDS.HIGH   ? 'bg-mirror-success' :
    value >= CONFIDENCE_THRESHOLDS.MEDIUM ? 'bg-mirror-warning' :
                                             'bg-mirror-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="confidence-bar w-20">
        <div className={`confidence-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-mirror-muted tabular-nums">{pct}%</span>
    </div>
  );
}

export function IntelligenceTrace({
  source,
  confidence,
  modelVersion,
  createdAt,
  mode,
  className,
}: IntelligenceTraceProps) {
  const badgeClass =
    source === 'local-on-device' ? 'badge-local' :
    source === 'cloud-gemini'    ? 'badge-cloud' :
    source === 'human'           ? 'badge-human' :
    'badge-local';

  return (
    <div className={clsx('flex items-center gap-3 flex-wrap', className)}>
      <span className={badgeClass}>
        {source === 'local-on-device' && '◈ '}
        {source === 'cloud-gemini'    && '☁ '}
        {source === 'human'           && '✓ '}
        {INFERENCE_SOURCE_LABELS[source] ?? source}
      </span>

      {mode && (
        <span
          className={clsx(
            'px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border',
            mode === 'real'
              ? 'bg-mirror-success/10 text-mirror-success border-mirror-success/30'
              : 'bg-mirror-warning/10 text-mirror-warning border-mirror-warning/30'
          )}
        >
          {mode === 'real' ? '● Live Inference' : '○ Simulated/Demo'}
        </span>
      )}

      <ConfidenceBar value={confidence} />

      {modelVersion && (
        <span className="text-xs text-mirror-muted font-mono">{modelVersion}</span>
      )}

      <span className="text-xs text-mirror-muted">
        {new Date(createdAt).toLocaleString()}
      </span>
    </div>
  );
}
