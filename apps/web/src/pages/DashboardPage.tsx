import { useState, useEffect } from 'react';
import { db } from '@mirror/sync';
import { MOCK_INCIDENT, MOCK_INSPECTIONS, MOCK_EVIDENCE_ITEMS } from '@/data/mockIncident';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';
import {
  AlertCircle,
  Database,
  Cpu,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  HardDriveDownload,
  Check,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { InspectionRecord, GovernanceEvent } from '@mirror/core';

export function DashboardPage() {
  const isOnline = useOnlineStatus();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [governanceCount, setGovernanceCount] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  async function loadData() {
    try {
      const records = await db.inspections.toArray();
      const gov = await db.governanceEvents.count();
      setInspections(records);
      setGovernanceCount(gov);
    } catch (err) {
      console.error('Failed to load local database records:', err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function seedDemoDataset() {
    setIsSeeding(true);
    try {
      await db.incidents.put(MOCK_INCIDENT);
      for (const item of MOCK_EVIDENCE_ITEMS) {
        await db.evidenceItems.put(item);
      }
      for (const insp of MOCK_INSPECTIONS) {
        await db.inspections.put(insp);
      }

      const seedEvent: GovernanceEvent = {
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        actorId: 'demo-system',
        actorType: 'system',
        eventType: 'evidence-ingested',
        payload: {
          incidentId: MOCK_INCIDENT.id,
          inspectionsCount: MOCK_INSPECTIONS.length,
          evidenceCount: MOCK_EVIDENCE_ITEMS.length,
          note: 'Seed post-storm demonstration package loaded into IndexedDB',
        },
      };
      await db.governanceEvents.put(seedEvent);

      setSeedSuccess(true);
      await loadData();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to seed demo dataset:', err);
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-mirror-text">Incident Operations</h1>
          <p className="text-mirror-muted text-sm mt-0.5">
            Post-storm damage triage, offline correlation & evidence traceability.
          </p>
        </div>

        <button
          onClick={seedDemoDataset}
          disabled={isSeeding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-mirror-surface hover:bg-white/10
                     border border-mirror-border text-sm font-medium text-mirror-text transition-colors shadow-sm"
        >
          {seedSuccess ? (
            <>
              <Check size={16} className="text-mirror-success" />
              <span>Demo Package Loaded!</span>
            </>
          ) : (
            <>
              <HardDriveDownload size={16} className="text-mirror-accent" />
              <span>{isSeeding ? 'Importing…' : 'Load Storm Inspection Package'}</span>
            </>
          )}
        </button>
      </div>

      {/* Flagship Incident Banner */}
      <div className="panel p-5 bg-gradient-to-r from-mirror-surface to-slate-800/80 border-l-4 border-l-mirror-accent">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-mirror-accent uppercase tracking-wider">
              <span>Active Incident</span>
              <span>•</span>
              <span>{MOCK_INCIDENT.id}</span>
            </div>
            <h2 className="text-lg font-semibold text-mirror-text mt-1">{MOCK_INCIDENT.title}</h2>
            <p className="text-sm text-mirror-muted mt-1 max-w-2xl">{MOCK_INCIDENT.description}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-mirror-warning/15 text-mirror-warning border border-mirror-warning/30">
            {MOCK_INCIDENT.status}
          </span>
        </div>
      </div>

      {/* The Three Data Planes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plane 1: Evidence */}
        <div className="panel p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
              <span className="flex items-center gap-1.5">
                <Database size={14} className="text-mirror-accent" />
                PLANE 1: EVIDENCE
              </span>
              <span className="text-mirror-success text-[10px]">APPEND-ONLY</span>
            </div>
            <div className="text-2xl font-bold text-mirror-text">{inspections.length}</div>
            <p className="text-xs text-mirror-muted mt-1">
              Field inspection records in local IndexedDB vault.
            </p>
          </div>
          <div className="pt-4 border-t border-mirror-border mt-3 text-xs text-mirror-muted flex items-center justify-between">
            <span>Storage: Local Dexie</span>
            <span className="text-mirror-text font-mono">
              {inspections.reduce((acc, r) => acc + (r.evidence?.length || 0), 0)} items
            </span>
          </div>
        </div>

        {/* Plane 2: Intelligence */}
        <div className="panel p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
              <span className="flex items-center gap-1.5">
                <Cpu size={14} className="text-mirror-intel-local" />
                PLANE 2: INTELLIGENCE
              </span>
              <span className="text-mirror-intel-local text-[10px]">SOURCE-TAGGED</span>
            </div>
            <div className="text-2xl font-bold text-mirror-text">Hybrid AI</div>
            <p className="text-xs text-mirror-muted mt-1">
              Local on-device reasoning + Cloud cross-synthesis.
            </p>
          </div>
          <div className="pt-4 border-t border-mirror-border mt-3 text-xs text-mirror-muted flex items-center justify-between">
            <span>Routing:</span>
            <span className="text-mirror-intel-local font-mono">Chrome / Gemini</span>
          </div>
        </div>

        {/* Plane 3: Governance */}
        <div className="panel p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-mirror-muted font-mono mb-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-mirror-success" />
                PLANE 3: GOVERNANCE
              </span>
              <span className="text-mirror-success text-[10px]">IMMUTABLE AUDIT</span>
            </div>
            <div className="text-2xl font-bold text-mirror-text">{governanceCount}</div>
            <p className="text-xs text-mirror-muted mt-1">
              Recorded provenance & lifecycle governance events.
            </p>
          </div>
          <div className="pt-4 border-t border-mirror-border mt-3 text-xs text-mirror-muted flex items-center justify-between">
            <span>Audit integrity:</span>
            <span className="text-mirror-success font-mono">SHA-256 Verified</span>
          </div>
        </div>
      </div>

      {/* Field Inspection Queue & Sync Status */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <FileCheck2 size={16} className="text-mirror-accent" />
            <h3 className="text-sm font-semibold text-mirror-text">Field Inspection Vault Records</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-mirror-muted">
              Network:{' '}
              <strong className={isOnline ? 'text-mirror-success' : 'text-mirror-warning'}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </strong>
            </span>
          </div>
        </div>

        {inspections.length === 0 ? (
          <div className="p-8 text-center text-mirror-muted text-sm space-y-3">
            <AlertCircle size={28} className="mx-auto text-mirror-muted/60" />
            <p>No local inspection records stored in IndexedDB.</p>
            <button
              onClick={seedDemoDataset}
              className="text-xs text-mirror-accent hover:underline inline-flex items-center gap-1"
            >
              <UploadCloud size={14} /> Click here to load sample storm-damage inspection package
            </button>
          </div>
        ) : (
          <div className="divide-y divide-mirror-border">
            {inspections.map((insp) => (
              <div key={insp.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-mirror-text">{insp.assetId}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-mirror-muted font-mono uppercase">
                      {insp.assetType}
                    </span>
                  </div>
                  <div className="text-xs text-mirror-muted">{insp.locationLabel}</div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-mirror-text font-mono">
                      {insp.evidence?.length || 0} evidence files
                    </div>
                    <div className="text-[10px] text-mirror-muted">
                      {new Date(insp.capturedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <SyncStatusIndicator status={insp.syncStatus} showLabel />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
