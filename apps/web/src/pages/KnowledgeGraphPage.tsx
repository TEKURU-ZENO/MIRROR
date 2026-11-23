// MIRROR – Knowledge Graph Page
// Correlates inspections, evidence items, and intelligence records visually using React Flow.
// Provides AI Cross-Inspection Synthesis, Conflict Detection, and Spatial Damage Cascading Analysis.

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Network,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Zap,
  MapPin,
} from 'lucide-react';
import { db } from '@mirror/sync';
import {
  generateId,
  nowISO,
  type InspectionRecord,
  type EvidenceItem,
  type IntelligenceRecord,
  type CrossInspectionAssessment,
  type DamageLevel,
  type InfrastructureAsset,
} from '@mirror/core';
import {
  synthesizeInspections,
  detectConflicts,
  analyzeDamageCascades,
  clusterSpatialDamage,
  type AssetDamageState,
} from '@mirror/ai';
import { EvidenceGraph } from '@/components/graph/EvidenceGraph';
import { GraphLegend } from '@/components/graph/GraphLegend';

function getDamageBadgeClass(level: DamageLevel): string {
  switch (level) {
    case 'none':
    case 'minor':
      return 'bg-mirror-success/15 text-mirror-success border-mirror-success/30';
    case 'moderate':
      return 'bg-mirror-warning/15 text-mirror-warning border-mirror-warning/30';
    case 'severe':
    case 'destroyed':
      return 'bg-mirror-danger/15 text-mirror-danger border-mirror-danger/30';
    default:
      return 'bg-mirror-muted/15 text-mirror-muted border-mirror-border';
  }
}

export function KnowledgeGraphPage() {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceRecord[]>([]);
  const [lastSynthesis, setLastSynthesis] = useState<CrossInspectionAssessment | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningAI, setIsRunningAI] = useState<boolean>(false);
  const [isRunningConflicts, setIsRunningConflicts] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const [allInspections, allEvidence, allIntelligence] = await Promise.all([
        db.inspections.toArray(),
        db.evidenceItems.toArray(),
        db.intelligence.toArray(),
      ]);

      setInspections(allInspections);
      setEvidenceItems(allEvidence);
      setIntelligence(allIntelligence);

      const synthesisRecords = allIntelligence
        .filter((r) => r.content.kind === 'cross-inspection-assessment')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (synthesisRecords.length > 0) {
        setLastSynthesis(synthesisRecords[0].content as CrossInspectionAssessment);
      }
    } catch (err) {
      console.error('[KnowledgeGraph] Failed to load data from Dexie:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRunSynthesis = async () => {
    if (inspections.length === 0) return;
    setIsRunningAI(true);
    try {
      const assessment = await synthesizeInspections(inspections, evidenceItems);
      const newRecord: IntelligenceRecord = {
        id: generateId(),
        inspectionId: inspections[0]?.id ?? 'cross-incident',
        createdAt: nowISO(),
        inferenceSource: 'cloud-gemini',
        modelVersion: 'gemini-2.0-flash',
        confidence: 0.88,
        content: assessment,
      };

      await db.intelligence.add(newRecord);
      setLastSynthesis(assessment);
      await loadData();
    } catch (err) {
      console.error('[KnowledgeGraph] Synthesis execution failed:', err);
    } finally {
      setIsRunningAI(false);
    }
  };

  const handleDetectConflicts = async () => {
    if (inspections.length === 0) return;
    setIsRunningConflicts(true);
    try {
      const conflicts = await detectConflicts(inspections);
      for (const flag of conflicts) {
        const conflictRecord: IntelligenceRecord = {
          id: generateId(),
          inspectionId: flag.conflictingInspectionIds[0] ?? inspections[0]?.id ?? 'cross-incident',
          createdAt: nowISO(),
          inferenceSource: 'cloud-gemini',
          modelVersion: 'gemini-2.0-flash',
          confidence: 0.85,
          content: flag,
        };
        await db.intelligence.add(conflictRecord);
      }
      await loadData();
    } catch (err) {
      console.error('[KnowledgeGraph] Conflict detection failed:', err);
    } finally {
      setIsRunningConflicts(false);
    }
  };

  // Derive spatial assets & topological connectivity from inspection records
  const { assetMap, damageStates } = useMemo(() => {
    const map = new Map<string, InfrastructureAsset>();
    const states: AssetDamageState[] = [];

    inspections.forEach((insp, index) => {
      // Connect adjacent sequential assets in the demo grid
      const prevId = index > 0 ? inspections[index - 1].assetId : undefined;
      const nextId = index < inspections.length - 1 ? inspections[index + 1].assetId : undefined;
      const connected = [prevId, nextId].filter((id): id is string => Boolean(id));

      const criticalityVal: 1 | 2 | 3 | 4 | 5 =
        insp.assetType === 'substation' ? 5 :
        insp.assetType === 'feeder' || insp.assetType === 'transformer' ? 4 :
        insp.assetType === 'bridge' ? 4 : 3;

      map.set(insp.assetId, {
        id: insp.assetId,
        name: `${insp.assetType.toUpperCase()} ${insp.assetId}`,
        assetType: insp.assetType,
        criticality: criticalityVal,
        location: {
          label: insp.locationLabel,
          coordinates: insp.coordinates,
        },
        connectedAssetIds: connected,
      });

      // Infer damage level from observation summaries in intelligence plane
      const relatedIntel = intelligence.find(
        (rec) => rec.inspectionId === insp.id && rec.content.kind === 'observation-summary'
      );
      const level: DamageLevel =
        relatedIntel && relatedIntel.content.kind === 'observation-summary'
          ? relatedIntel.content.damageLevel
          : index === 0 ? 'severe' : 'moderate';

      states.push({
        assetId: insp.assetId,
        damageLevel: level,
        riskScore: level === 'severe' || level === 'destroyed' ? 85 : 45,
        defectTypes: [insp.assetType],
      });
    });

    return { assetMap: map, damageStates: states };
  }, [inspections, intelligence]);

  // Execute spatial & topological cascade analysis
  const cascades = useMemo(
    () => analyzeDamageCascades(damageStates, assetMap),
    [damageStates, assetMap]
  );

  const clusters = useMemo(
    () => clusterSpatialDamage(damageStates, assetMap),
    [damageStates, assetMap]
  );

  const hasData = inspections.length > 0 || evidenceItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-mirror-accent" />
            <h1 className="text-2xl font-semibold text-mirror-text">Knowledge Graph</h1>
          </div>
          <p className="text-mirror-muted text-sm mt-1">
            Visual correlation of field inspections, ingested evidence, spatial corridors, and cascading outage risks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading || isRunningAI || isRunningConflicts}
            className="panel px-3 py-1.5 text-xs font-medium text-mirror-muted hover:text-mirror-text hover:bg-mirror-surface/80 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleDetectConflicts}
            disabled={!hasData || isRunningConflicts || isRunningAI}
            className="panel px-3 py-1.5 text-xs font-medium text-mirror-warning hover:bg-mirror-surface/80 flex items-center gap-1.5 transition-colors disabled:opacity-50 border-mirror-warning/30"
          >
            {isRunningConflicts ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Detect Conflicts
          </button>

          <button
            type="button"
            onClick={handleRunSynthesis}
            disabled={!hasData || isRunningAI || isRunningConflicts}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-mirror-accent text-white hover:bg-mirror-accent/90 flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            {isRunningAI ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Run AI Synthesis
          </button>
        </div>
      </div>

      {/* Main Graph Area or Empty State */}
      {!isLoading && !hasData ? (
        <div className="panel p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Network className="w-10 h-10 text-mirror-muted/50 stroke-1" />
          <h3 className="text-base font-medium text-mirror-text">No Evidence Data Available</h3>
          <p className="text-mirror-muted text-sm max-w-md">
            Load an inspection package from the Dashboard first.
          </p>
        </div>
      ) : (
        <div
          className="panel relative w-full overflow-hidden border border-mirror-border bg-mirror-bg"
          style={{ height: 'calc(100vh - 260px)' }}
        >
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <GraphLegend />
          </div>

          {(isRunningAI || isRunningConflicts) && (
            <div className="absolute inset-0 z-20 bg-mirror-bg/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-mirror-accent animate-spin" />
              <div className="text-sm font-medium text-mirror-text">
                {isRunningAI
                  ? 'Synthesizing cross-inspection intelligence…'
                  : 'Detecting conflicting evidence…'}
              </div>
            </div>
          )}

          <EvidenceGraph
            inspections={inspections}
            evidenceItems={evidenceItems}
            intelligence={intelligence}
          />
        </div>
      )}

      {/* Spatial Corridor & Topological Cascades Intelligence */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cascading Outage Risk Card */}
          <div className="panel p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-mirror-border pb-2.5">
              <Zap className="w-4 h-4 text-mirror-danger" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-mirror-text">
                Topological Cascades & Power Loss Hazards
              </h2>
            </div>

            {cascades.length === 0 ? (
              <p className="text-xs text-mirror-muted">
                No active cascading risks detected across verified grid topologies.
              </p>
            ) : (
              <div className="space-y-2.5">
                {cascades.map((cascade) => (
                  <div
                    key={cascade.sourceAssetId}
                    className="p-3 rounded-lg border border-mirror-danger/30 bg-mirror-danger/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-mirror-danger">
                        {cascade.sourceAssetId} ({cascade.sourceSeverity.toUpperCase()})
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-mirror-danger/15 text-mirror-danger font-semibold">
                        {cascade.totalDownstreamAffected} Downstream Assets At Risk
                      </span>
                    </div>
                    <p className="text-xs text-mirror-muted">
                      Failure at {cascade.sourceAssetId} threatens service continuity along connected downstream nodes:
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {cascade.isolatedAssetIds.map((id) => (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 rounded bg-mirror-surface border border-mirror-border font-mono text-[10px] text-mirror-text"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spatial Damage Corridors Card */}
          <div className="panel p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-mirror-border pb-2.5">
              <MapPin className="w-4 h-4 text-mirror-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-mirror-text">
                Geographic Damage Corridors ({clusters.length})
              </h2>
            </div>

            {clusters.length === 0 ? (
              <p className="text-xs text-mirror-muted">
                No spatial coordinate clusters identified for active inspections.
              </p>
            ) : (
              <div className="space-y-2.5">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.clusterId}
                    className="p-3 rounded-lg border border-mirror-border bg-mirror-surface/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-mirror-text">
                        {cluster.corridorLabel}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-mirror-accent">
                        Score: {cluster.totalDamageScore}
                      </span>
                    </div>
                    <p className="text-xs text-mirror-muted font-mono">
                      GPS Centroid: {cluster.centroid.lat}, {cluster.centroid.lng}
                    </p>
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {cluster.assetIds.map((id) => (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 rounded bg-mirror-surface/80 border border-mirror-border font-mono text-[10px] text-mirror-muted"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Synthesis Result Section */}
      {lastSynthesis && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-mirror-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-mirror-intel-cloud" />
              <h2 className="text-sm font-semibold text-mirror-text uppercase tracking-wide">
                Latest Cross-Inspection Assessment
              </h2>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getDamageBadgeClass(
                lastSynthesis.overallDamageLevel
              )}`}
            >
              Overall: {lastSynthesis.overallDamageLevel}
            </span>
          </div>

          <p className="text-sm text-mirror-text leading-relaxed">
            {lastSynthesis.summary}
          </p>

          {lastSynthesis.priorityRanking && lastSynthesis.priorityRanking.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-mirror-muted">
                Priority Ranking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {lastSynthesis.priorityRanking.map((rank) => (
                  <div
                    key={rank.inspectionId}
                    className="p-2.5 rounded border border-mirror-border bg-mirror-surface/50 text-xs flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-mirror-accent/20 text-mirror-accent flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      #{rank.priority}
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-mono text-mirror-muted text-[11px]">
                        Inspection: {rank.inspectionId}
                      </div>
                      <div className="text-mirror-text">{rank.rationale}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
