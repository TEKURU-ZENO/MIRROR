// MIRROR — Cross-Inspection Systemic Intelligence Correlator
// Synthesizes evidence across all field inspection sites to identify systemic infrastructure defects,
// recurring component failure modes, and environmental incident swaths.

import type { DamageLevel, InspectionRecord } from '@mirror/core';
import type { DamageObservation } from '@mirror/evidence';
import { generateId } from '@mirror/core';

export interface SystemicPattern {
  id: string;
  patternType: 'common-component-defect' | 'geographic-swath' | 'cascading-overload';
  title: string;
  description: string;
  affectedInspectionIds: string[];
  affectedAssetIds: string[];
  evidenceIds: string[];
  frequency: number;
  confidence: number;
  preventativeRecommendation: string;
}

export interface CrossInspectionCorrelationReport {
  incidentId: string;
  totalInspectionsAnalyzed: number;
  patterns: SystemicPattern[];
  hypothesizedRootCause: string;
  estimatedRegionalDamageLevel: DamageLevel;
}

/**
 * Analyze observations and inspections across an entire incident to extract systemic patterns.
 */
export function correlateCrossInspectionEvidence(
  incidentId: string,
  inspections: InspectionRecord[],
  observations: DamageObservation[] = []
): CrossInspectionCorrelationReport {
  const patterns: SystemicPattern[] = [];

  // 1. Group observations by defectType & component to detect systemic recurring defects
  const defectGroups = new Map<string, DamageObservation[]>();

  for (const obs of observations) {
    const key = `${obs.defectType}::${obs.component}`;
    const list = defectGroups.get(key) ?? [];
    list.push(obs);
    defectGroups.set(key, list);
  }

  for (const [key, obsList] of defectGroups) {
    if (obsList.length >= 2) {
      const [defectType, component] = key.split('::');
      const inspectionIds = Array.from(new Set(obsList.map((o) => o.inspectionId)));
      const assetIds = Array.from(new Set(obsList.map((o) => o.assetId)));
      const evidenceIds = Array.from(new Set(obsList.map((o) => o.evidenceId)));

      patterns.push({
        id: generateId(),
        patternType: 'common-component-defect',
        title: `Recurring ${component} ${defectType} (${obsList.length} sites)`,
        description: `Multiple field units reported identical ${defectType} failures localized on ${component} across ${assetIds.length} assets. Suggests systemic structural vulnerability under storm loading.`,
        affectedInspectionIds: inspectionIds,
        affectedAssetIds: assetIds,
        evidenceIds,
        frequency: obsList.length,
        confidence: 0.92,
        preventativeRecommendation: `Issue fleet-wide engineering inspection bulletin for ${component} structural integrity.`,
      });
    }
  }

  // 2. Determine hypothesized root cause
  let hypothesizedRootCause = 'General localized storm impact.';
  let estimatedRegionalDamageLevel: DamageLevel = 'moderate';

  const criticalCount = observations.filter((o) => o.severity === 'critical' || o.severity === 'severe').length;
  if (criticalCount >= 3) {
    hypothesizedRootCause =
      'Severe microburst / derecho wind shear along linear transmission corridor resulting in multi-span structural failures.';
    estimatedRegionalDamageLevel = 'severe';
  } else if (observations.some((o) => o.defectType === 'washout-erosion')) {
    hypothesizedRootCause =
      'Flash flooding and culvert hydraulic overflow leading to ground scouring and foundation destabilization.';
    estimatedRegionalDamageLevel = 'moderate';
  }

  return {
    incidentId,
    totalInspectionsAnalyzed: inspections.length,
    patterns,
    hypothesizedRootCause,
    estimatedRegionalDamageLevel,
  };
}
