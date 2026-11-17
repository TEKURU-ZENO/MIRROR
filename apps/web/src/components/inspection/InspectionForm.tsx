import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { db } from '@mirror/sync';
import { generateId, nowISO } from '@mirror/core';
import type { AssetType, DamageLevel } from '@mirror/core';

const ASSET_TYPES: AssetType[] = [
  'power-line', 'transformer', 'pole', 'substation',
  'bridge', 'road', 'pipeline', 'other',
];

const DAMAGE_LEVELS: DamageLevel[] = [
  'none', 'minor', 'moderate', 'severe', 'destroyed', 'unknown',
];

const DAMAGE_COLORS: Record<DamageLevel, string> = {
  none:      'bg-mirror-success/20 text-mirror-success border-mirror-success/40',
  minor:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  moderate:  'bg-orange-500/20 text-orange-400 border-orange-500/40',
  severe:    'bg-mirror-danger/20 text-mirror-danger border-mirror-danger/40',
  destroyed: 'bg-red-900/40 text-red-300 border-red-700/60',
  unknown:   'bg-mirror-muted/20 text-mirror-muted border-mirror-border',
};

interface MeasurementRow {
  id: string;
  label: string;
  value: string;
  unit: string;
}

interface InspectionFormProps {
  onSaved: (id: string) => void;
}

const INCIDENT_ID = 'inc-storm-2026-09';
const INSPECTOR_ID = 'demo-inspector';

export function InspectionForm({ onSaved }: InspectionFormProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [assetId, setAssetId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('pole');
  const [locationLabel, setLocationLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // Step 2
  const [damageLevel, setDamageLevel] = useState<DamageLevel>('unknown');
  const [fieldNotes, setFieldNotes] = useState('');

  // Step 3
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);

  const addMeasurement = () => {
    setMeasurements(prev => [...prev, { id: generateId(), label: '', value: '', unit: '' }]);
  };

  const removeMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  const updateMeasurement = (id: string, field: keyof Omit<MeasurementRow, 'id'>, val: string) => {
    setMeasurements(prev =>
      prev.map(m => m.id === id ? { ...m, [field]: val } : m)
    );
  };

  const handleSave = async () => {
    if (!assetId.trim() || !locationLabel.trim()) return;
    setSaving(true);
    try {
      const id = generateId();
      const now = nowISO();

      const coordinates =
        lat.trim() !== '' && lng.trim() !== ''
          ? { lat: parseFloat(lat), lng: parseFloat(lng) }
          : undefined;

      await db.inspections.add({
        id,
        incidentId: INCIDENT_ID,
        inspectorId: INSPECTOR_ID,
        assetId: assetId.trim(),
        assetType,
        locationLabel: locationLabel.trim(),
        coordinates,
        capturedAt: now,
        ingestedAt: now,
        syncStatus: 'local-only',
        evidence: [],
      });

      // Save measurements
      for (const m of measurements) {
        if (m.label.trim() && m.value.trim()) {
          await db.measurements.add({
            id: m.id,
            inspectionId: id,
            label: m.label.trim(),
            value: parseFloat(m.value),
            unit: m.unit.trim(),
            capturedAt: now,
          });
        }
      }

      // Store damage/notes as intelligence record (ObservationSummary)
      const intelId = generateId();
      await db.intelligence.add({
        id: intelId,
        inspectionId: id,
        createdAt: now,
        inferenceSource: 'human',
        confidence: 1.0,
        content: {
          kind: 'observation-summary',
          text: fieldNotes,
          damageLevel,
          keyFindings: [],
          caveats: [],
        },
      });

      // Log governance event
      await db.governanceEvents.add({
        id: generateId(),
        occurredAt: now,
        actorId: INSPECTOR_ID,
        actorType: 'inspector',
        eventType: 'evidence-ingested',
        payload: { inspectionId: id, assetId, assetType, locationLabel, damageLevel },
      });

      onSaved(id);
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = ['Asset Info', 'Damage Assessment', 'Measurements'];

  return (
    <div className="panel p-6 max-w-xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {stepTitles.map((title, i) => (
          <div key={title} className="flex items-center gap-2">
            <div
              className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border',
                i === step
                  ? 'bg-mirror-accent text-white border-mirror-accent'
                  : i < step
                  ? 'bg-mirror-success/20 text-mirror-success border-mirror-success/40'
                  : 'bg-mirror-surface text-mirror-muted border-mirror-border'
              )}
            >
              {i + 1}
            </div>
            <span
              className={clsx(
                'text-xs',
                i === step ? 'text-mirror-text font-medium' : 'text-mirror-muted'
              )}
            >
              {title}
            </span>
            {i < stepTitles.length - 1 && (
              <ChevronRight size={14} className="text-mirror-border mr-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Asset Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-mirror-muted mb-1">Asset ID</label>
            <input
              type="text"
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              placeholder="e.g. POLE-00412"
              className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-mirror-muted mb-1">Asset Type</label>
            <select
              value={assetType}
              onChange={e => setAssetType(e.target.value as AssetType)}
              className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text focus:outline-none focus:border-mirror-accent"
            >
              {ASSET_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-mirror-muted mb-1">Location Label</label>
            <input
              type="text"
              value={locationLabel}
              onChange={e => setLocationLabel(e.target.value)}
              placeholder="e.g. Oak St & 5th Ave"
              className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-mirror-muted mb-1">Latitude <span className="text-mirror-border">(optional)</span></label>
              <input
                type="number"
                value={lat}
                onChange={e => setLat(e.target.value)}
                placeholder="40.7128"
                step="any"
                className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-mirror-muted mb-1">Longitude <span className="text-mirror-border">(optional)</span></label>
              <input
                type="number"
                value={lng}
                onChange={e => setLng(e.target.value)}
                placeholder="-74.0060"
                step="any"
                className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Damage Assessment */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-mirror-muted mb-2">Damage Level</label>
            <div className="flex flex-wrap gap-2">
              {DAMAGE_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDamageLevel(level)}
                  className={clsx(
                    'px-3 py-1.5 rounded border text-xs font-semibold capitalize transition-colors',
                    damageLevel === level
                      ? DAMAGE_COLORS[level]
                      : 'bg-mirror-surface text-mirror-muted border-mirror-border hover:border-mirror-accent/40'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-mirror-muted mb-1">Field Notes</label>
            <textarea
              rows={4}
              value={fieldNotes}
              onChange={e => setFieldNotes(e.target.value)}
              placeholder="Describe observations..."
              className="w-full bg-mirror-surface border border-mirror-border rounded px-3 py-2 text-sm text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 3: Measurements */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-mirror-muted">Add optional measurements below.</span>
            <button
              type="button"
              onClick={addMeasurement}
              className="text-xs text-mirror-accent border border-mirror-accent/40 rounded px-2 py-1 hover:bg-mirror-accent/10 transition-colors"
            >
              + Add Measurement
            </button>
          </div>

          {measurements.length === 0 && (
            <p className="text-xs text-mirror-muted italic py-4 text-center border border-dashed border-mirror-border rounded">
              No measurements yet. Click "Add Measurement" to start.
            </p>
          )}

          {measurements.map((m, idx) => (
            <div key={m.id} className="flex gap-2 items-center border border-mirror-border rounded p-2">
              <span className="text-[10px] text-mirror-muted font-mono w-5 shrink-0 text-center">{idx + 1}</span>
              <input
                type="text"
                value={m.label}
                onChange={e => updateMeasurement(m.id, 'label', e.target.value)}
                placeholder="Label"
                className="flex-1 bg-mirror-surface border border-mirror-border rounded px-2 py-1 text-xs text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
              />
              <input
                type="number"
                value={m.value}
                onChange={e => updateMeasurement(m.id, 'value', e.target.value)}
                placeholder="Value"
                step="any"
                className="w-24 bg-mirror-surface border border-mirror-border rounded px-2 py-1 text-xs text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
              />
              <input
                type="text"
                value={m.unit}
                onChange={e => updateMeasurement(m.id, 'unit', e.target.value)}
                placeholder="Unit"
                className="w-16 bg-mirror-surface border border-mirror-border rounded px-2 py-1 text-xs text-mirror-text placeholder-mirror-muted focus:outline-none focus:border-mirror-accent"
              />
              <button
                type="button"
                onClick={() => removeMeasurement(m.id)}
                className="text-mirror-danger hover:text-red-400 text-xs px-1"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-mirror-border">
        <button
          type="button"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className={clsx(
            'flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors',
            step === 0
              ? 'text-mirror-muted cursor-not-allowed'
              : 'text-mirror-text hover:bg-white/5 border border-mirror-border'
          )}
        >
          <ChevronLeft size={15} />
          Back
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && (!assetId.trim() || !locationLabel.trim())}
            className={clsx(
              'flex items-center gap-1 px-4 py-1.5 rounded text-sm font-medium transition-colors',
              step === 0 && (!assetId.trim() || !locationLabel.trim())
                ? 'bg-mirror-accent/30 text-mirror-accent/50 cursor-not-allowed'
                : 'bg-mirror-accent text-white hover:bg-mirror-accent/80'
            )}
          >
            Next
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium bg-mirror-success text-white hover:bg-mirror-success/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Inspection'}
          </button>
        )}
      </div>
    </div>
  );
}
