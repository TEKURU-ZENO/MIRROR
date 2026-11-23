// MIRROR — Enterprise Asset Registry & Fleet Management Panel
import { useState } from 'react';
import {
  generateSampleAssetFleet,
  createOrganizationProfile,
  type AssetRegistryItem,
  type CustomerOrganization,
} from '@mirror/core';
import {
  Building2,
  ShieldCheck,
  Check,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AssetFleetPanel() {
  const [org] = useState<CustomerOrganization>(() => createOrganizationProfile({}));
  const [fleet, setFleet] = useState<AssetRegistryItem[]>(() => generateSampleAssetFleet());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const filteredFleet = selectedType === 'all'
    ? fleet
    : fleet.filter((a) => a.assetType === selectedType);

  const criticalityCounts = fleet.reduce(
    (acc, a) => {
      acc[a.criticality] = (acc[a.criticality] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function reloadDemoFleet() {
    setFleet(generateSampleAssetFleet());
    setImportNotice('Default enterprise asset fleet successfully reloaded.');
    setTimeout(() => setImportNotice(null), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <div className="panel p-5 bg-gradient-to-r from-mirror-surface to-slate-900 border-l-4 border-l-mirror-accent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-mirror-accent" />
              <h2 className="text-lg font-bold text-mirror-text">{org.name}</h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mirror-accent/20 text-mirror-accent border border-mirror-accent/30">
                {org.tier}
              </span>
            </div>
            <p className="text-xs text-mirror-muted">
              Headquarters: <span className="text-mirror-text">{org.headquarters}</span> • Primary Industry:{' '}
              <span className="text-mirror-text capitalize">{org.industry.replace('-', ' ')}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {org.regulatoryStandards.map((std) => (
              <span
                key={std}
                className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                <ShieldCheck size={12} />
                {std}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="text-xs text-mirror-muted font-mono mb-1">TOTAL ASSETS</div>
          <div className="text-2xl font-bold text-mirror-text">{fleet.length}</div>
          <div className="text-[11px] text-mirror-muted mt-1">Monitored units</div>
        </div>
        <div className="panel p-4 border-l-2 border-l-rose-500">
          <div className="text-xs text-mirror-muted font-mono mb-1">TIER-1 CRITICAL</div>
          <div className="text-2xl font-bold text-rose-400">
            {criticalityCounts['tier-1-critical'] || 0}
          </div>
          <div className="text-[11px] text-mirror-muted mt-1">High cascading risk</div>
        </div>
        <div className="panel p-4 border-l-2 border-l-amber-500">
          <div className="text-xs text-mirror-muted font-mono mb-1">TIER-2 ESSENTIAL</div>
          <div className="text-2xl font-bold text-amber-400">
            {criticalityCounts['tier-2-essential'] || 0}
          </div>
          <div className="text-[11px] text-mirror-muted mt-1">Sub-transmission</div>
        </div>
        <div className="panel p-4 border-l-2 border-l-blue-500">
          <div className="text-xs text-mirror-muted font-mono mb-1">TIER-3 STANDARD</div>
          <div className="text-2xl font-bold text-blue-400">
            {criticalityCounts['tier-3-standard'] || 0}
          </div>
          <div className="text-[11px] text-mirror-muted mt-1">Feeder distribution</div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-mirror-text">Asset Registry Inventory</h3>
              <div className="flex gap-1">
                {['all', 'substation', 'transformer', 'transmission-tower', 'bridge-pier', 'distribution-pole'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
                      selectedType === type
                        ? 'bg-mirror-accent text-white font-medium'
                        : 'text-mirror-muted hover:text-mirror-text hover:bg-white/5'
                    }`}
                  >
                    {type.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={reloadDemoFleet}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-white/5 hover:bg-white/10 border border-mirror-border text-mirror-text transition-colors"
            >
              <Plus size={13} className="text-mirror-accent" />
              Reset Demo Fleet
            </button>
          </div>
        </div>

        {importNotice && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs text-emerald-400 flex items-center gap-2">
            <Check size={14} />
            {importNotice}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-white/5 border-b border-mirror-border font-mono text-mirror-muted">
              <tr>
                <th className="p-3">Asset ID / Name</th>
                <th className="p-3">Asset Class</th>
                <th className="p-3">Criticality</th>
                <th className="p-3">Jurisdiction</th>
                <th className="p-3">Rating / Spec</th>
                <th className="p-3">Last Inspected</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mirror-border">
              {filteredFleet.map((asset) => (
                <tr key={asset.assetId} className="hover:bg-white/[0.02]">
                  <td className="p-3">
                    <div className="font-mono font-semibold text-mirror-text">{asset.assetId}</div>
                    <div className="text-[11px] text-mirror-muted">{asset.name}</div>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-mirror-text">
                      {asset.assetType.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                        asset.criticality === 'tier-1-critical'
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          : asset.criticality === 'tier-2-essential'
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      }`}
                    >
                      {asset.criticality.replace('tier-', 'T').replace('-', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-mirror-muted">{asset.jurisdiction}</td>
                  <td className="p-3 font-mono text-mirror-text">
                    {asset.voltageRatingKV ? `${asset.voltageRatingKV} kV` : 'N/A'}
                  </td>
                  <td className="p-3 font-mono text-mirror-muted">
                    {asset.lastInspectionDate || 'None'}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/inspection/${asset.assetId}`}
                      className="inline-flex items-center gap-1 text-[11px] text-mirror-accent hover:underline font-mono"
                    >
                      Inspect <ExternalLink size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
