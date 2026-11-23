// MIRROR — Commercial ROI & Operational Efficiency Panel
import { useState } from 'react';
import {
  calculateROI,
  DEFAULT_ROI_PARAMETERS,
  INDUSTRY_ROI_PRESETS,
  formatUSD,
  type ROIParameters,
} from '@mirror/core';
import {
  TrendingUp,
  Clock,
  ShieldAlert,
  Zap,
  Building,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export function CommercialRoiPanel() {
  const [params, setParams] = useState<ROIParameters>(DEFAULT_ROI_PARAMETERS);
  const [activePreset, setActivePreset] = useState<string>('default');

  const roi = calculateROI(params);

  function applyPreset(presetKey: string) {
    setActivePreset(presetKey);
    if (presetKey === 'default') {
      setParams(DEFAULT_ROI_PARAMETERS);
    } else {
      const preset = INDUSTRY_ROI_PRESETS[presetKey];
      if (preset) {
        setParams({ ...DEFAULT_ROI_PARAMETERS, ...preset });
      }
    }
  }

  function updateParam<K extends keyof ROIParameters>(key: K, value: number) {
    setActivePreset('custom');
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Preset Selector */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Building size={18} className="text-mirror-accent" />
          <span className="text-sm font-semibold text-mirror-text">Utility Sector Profile:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'default', label: 'National Average Grid' },
            { id: 'metro-electric-grid', label: 'Metro Power Grid (1.2k+ Insp)' },
            { id: 'regional-power-coop', label: 'Regional Electric Co-op' },
            { id: 'bridge-transit-authority', label: 'Civil Bridge Authority' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                activePreset === preset.id
                  ? 'bg-mirror-accent/20 border-mirror-accent text-mirror-accent'
                  : 'bg-white/5 border-mirror-border text-mirror-muted hover:text-mirror-text hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Net Economic Value */}
        <div className="panel p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
            <span>ANNUAL NET BENEFIT</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {formatUSD(roi.netAnnualBenefitUSD, true)}
            </div>
            <p className="text-xs text-mirror-muted mt-1">
              Net of platform subscription fee
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-mirror-border text-xs text-mirror-muted flex justify-between">
            <span>Return on Investment:</span>
            <span className="font-mono text-emerald-400 font-semibold">+{roi.roiPercentage}%</span>
          </div>
        </div>

        {/* Metric 2: Field & Engineering Hours Saved */}
        <div className="panel p-5 border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
            <span>ANNUAL HOURS SAVED</span>
            <Clock size={16} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">
              {roi.totalAnnualHoursSaved.toLocaleString()} hrs
            </div>
            <p className="text-xs text-mirror-muted mt-1">
              Direct report compilation & PE review
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-mirror-border text-xs text-mirror-muted flex justify-between">
            <span>Direct Labor Savings:</span>
            <span className="font-mono text-cyan-400 font-semibold">{formatUSD(roi.annualLaborSavingsUSD, true)}</span>
          </div>
        </div>

        {/* Metric 3: Turnaround Acceleration */}
        <div className="panel p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
            <span>TURNAROUND SPEEDUP</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">
              {roi.turnaroundAccelerationRatio}x
            </div>
            <p className="text-xs text-mirror-muted mt-1">
              5.0 hrs down to 0.8 hrs per report
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-mirror-border text-xs text-mirror-muted flex justify-between">
            <span>Payback Period:</span>
            <span className="font-mono text-amber-400 font-semibold">{roi.paybackPeriodMonths} months</span>
          </div>
        </div>

        {/* Metric 4: Cascading Outage Preemption */}
        <div className="panel p-5 border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
            <span>OUTAGE RISK REDUCTION</span>
            <ShieldAlert size={16} className="text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">
              {formatUSD(roi.annualPreemptedOutageSavingsUSD, true)}
            </div>
            <p className="text-xs text-mirror-muted mt-1">
              Cascading substation fault preemption
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-mirror-border text-xs text-mirror-muted flex justify-between">
            <span>Avoided Event Rate:</span>
            <span className="font-mono text-rose-400 font-semibold">{params.avoidedCatastrophicOutagesPerYear}/yr</span>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Adjusters */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4 border-b border-mirror-border pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-mirror-accent" />
            <h3 className="text-sm font-semibold text-mirror-text">Operational Parameters & Labor Cost Drivers</h3>
          </div>
          <span className="text-xs font-mono text-mirror-muted">
            Mode: <strong className="text-mirror-accent uppercase">{activePreset}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Annual Inspections */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-mirror-muted">Annual Inspections:</span>
              <span className="font-mono text-mirror-text font-bold">{params.annualInspections}</span>
            </div>
            <input
              type="range"
              min={100}
              max={2500}
              step={50}
              value={params.annualInspections}
              onChange={(e) => updateParam('annualInspections', Number(e.target.value))}
              className="w-full accent-mirror-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-mirror-muted mt-0.5">
              <span>100</span>
              <span>1,250</span>
              <span>2,500</span>
            </div>
          </div>

          {/* Field Inspector Hourly Rate */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-mirror-muted">Field Inspector Rate ($/hr):</span>
              <span className="font-mono text-mirror-text font-bold">${params.inspectorHourlyRate}</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={params.inspectorHourlyRate}
              onChange={(e) => updateParam('inspectorHourlyRate', Number(e.target.value))}
              className="w-full accent-mirror-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-mirror-muted mt-0.5">
              <span>$50</span>
              <span>$100</span>
              <span>$150</span>
            </div>
          </div>

          {/* PE Hourly Rate */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-mirror-muted">Licensed PE Rate ($/hr):</span>
              <span className="font-mono text-mirror-text font-bold">${params.peHourlyRate}</span>
            </div>
            <input
              type="range"
              min={100}
              max={250}
              step={5}
              value={params.peHourlyRate}
              onChange={(e) => updateParam('peHourlyRate', Number(e.target.value))}
              className="w-full accent-mirror-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-mirror-muted mt-0.5">
              <span>$100</span>
              <span>$175</span>
              <span>$250</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison: Legacy Manual vs. MIRROR Tri-Plane Hybrid */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <h3 className="text-sm font-semibold text-mirror-text">Operational Workflow Comparison</h3>
          <span className="text-xs text-mirror-muted">Civil & Electrical Asset Incident Response</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/5 border-b border-mirror-border font-mono text-mirror-muted">
              <tr>
                <th className="p-3">Workflow Dimension</th>
                <th className="p-3">Traditional Manual Workflow</th>
                <th className="p-3 text-mirror-accent">MIRROR Hybrid Intelligence</th>
                <th className="p-3 text-right">Impact Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mirror-border">
              <tr>
                <td className="p-3 font-medium text-mirror-text">Evidence Ingestion & Hashing</td>
                <td className="p-3 text-mirror-muted">Paper clipboards, unsecured photo galleries</td>
                <td className="p-3 text-mirror-accent flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  SHA-256 IndexedDB vault with GPS anchoring
                </td>
                <td className="p-3 text-right font-mono text-emerald-400">100% Provenance</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-mirror-text">Report Drafting Turnaround</td>
                <td className="p-3 text-mirror-muted">3.5 - 5.0 hours manual synthesis</td>
                <td className="p-3 text-mirror-accent flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  18 minutes on-device entity extraction
                </td>
                <td className="p-3 text-right font-mono text-emerald-400">~11.7x Faster</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-mirror-text">Field Conflict Reconciliation</td>
                <td className="p-3 text-mirror-muted">Silent overwrites or lost revision emails</td>
                <td className="p-3 text-mirror-accent flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  ADR-005 3-way conflict resolution panel
                </td>
                <td className="p-3 text-right font-mono text-emerald-400">Zero Silent Loss</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-mirror-text">Engineering Legal Sign-Off</td>
                <td className="p-3 text-mirror-muted">Unregulated PDF stamps without audit logs</td>
                <td className="p-3 text-mirror-accent flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  ADR-006 Licensed PE cryptographic token
                </td>
                <td className="p-3 text-right font-mono text-emerald-400">Statutory Compliant</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
