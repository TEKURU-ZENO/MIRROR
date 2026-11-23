// MIRROR — Decision Intelligence: Multi-Factor Incident Triage & Risk Prioritization
// Computes explainable, multi-factor priority rankings for infrastructure repair crews:
// Combines component defect severity, asset criticality, cascading electrical outages,
// and public safety proximity.

import type { InspectionRecord, InfrastructureAsset } from '@mirror/core';
import type { DamageObservation } from '@mirror/evidence';
import { analyzeDamageCascades } from './spatialGraph.js';

export type TriageActionRecommendation =
  | 'IMMEDIATE_DE_ENERGIZE'
  | 'DISPATCH_EMERGENCY_CREW'
  | 'SCHEDULED_REPAIR'
  | 'MONITOR';

export interface SiteTriageRecommendation {
  inspectionId: string;
  assetId: string;
  assetType: string;
  locationLabel: string;
  priorityRank: number; // 1 = Highest Emergency
  compositeRiskScore: number; // 0 - 100
  factors: {
    defectSeverityScore: number; // 0 - 100
    criticalityScore: number;    // 0 - 100
    cascadingImpactScore: number; // 0 - 100
    publicSafetyScore: number;   // 0 - 100
  };
  actionRecommendation: TriageActionRecommendation;
  rationale: string;
}

const SEVERITY_BASE_SCORES: Record<string, number> = {
  critical: 100,
  severe: 75,
  moderate: 40,
  minor: 15,
};

const CRITICALITY_BASE_SCORES: Record<number, number> = {
  5: 100,
  4: 80,
  3: 50,
  2: 25,
  1: 10,
};

/**
 * Infer public safety exposure from location labels and field notes.
 */
function evaluatePublicSafetyExposure(locationLabel: string, fieldNotes?: string): number {
  const text = `${locationLabel} ${fieldNotes ?? ''}`.toLowerCase();
  if (text.includes('school') || text.includes('hospital') || text.includes('highway') || text.includes('traffic')) {
    return 100;
  }
  if (text.includes('residential') || text.includes('street') || text.includes('crossing') || text.includes('downtown')) {
    return 75;
  }
  if (text.includes('commercial') || text.includes('park')) {
    return 50;
  }
  return 20; // rural or utility easement
}

/**
 * Compute multi-factor triage priority ranking across all inspections in an incident.
 */
export function prioritizeInspectionSites(
  inspections: InspectionRecord[],
  observations: DamageObservation[] = [],
  assetMap: Map<string, InfrastructureAsset> = new Map()
): SiteTriageRecommendation[] {
  // Pre-compute cascading failures
  const damageStates = inspections.map((insp) => ({
    assetId: insp.assetId,
    damageLevel: (observations.find((o) => o.inspectionId === insp.id)?.severity === 'critical' ? 'destroyed' : 'severe') as 'destroyed' | 'severe',
    riskScore: 80,
    defectTypes: [insp.assetType],
  }));

  const cascades = analyzeDamageCascades(damageStates, assetMap);
  const cascadeImpactMap = new Map<string, number>();
  cascades.forEach((c) => {
    cascadeImpactMap.set(c.sourceAssetId, Math.min(100, c.totalDownstreamAffected * 35));
  });

  const recommendations: Omit<SiteTriageRecommendation, 'priorityRank'>[] = [];

  for (const inspection of inspections) {
    const asset = assetMap.get(inspection.assetId);
    const relatedObs = observations.filter((o) => o.inspectionId === inspection.id);

    // 1. Defect Severity Score
    let maxSeverityScore = 30; // default baseline
    let highestSeverityLabel = 'moderate';

    for (const obs of relatedObs) {
      const score = SEVERITY_BASE_SCORES[obs.severity] ?? 30;
      if (score > maxSeverityScore) {
        maxSeverityScore = score;
        highestSeverityLabel = obs.severity;
      }
    }

    // 2. Criticality Score
    const crit = asset?.criticality ?? 3;
    const criticalityScore = CRITICALITY_BASE_SCORES[crit] ?? 50;

    // 3. Cascading Impact Score
    const cascadingImpactScore = cascadeImpactMap.get(inspection.assetId) ?? 0;

    // 4. Public Safety Exposure Score
    const notes = inspection.evidence.map((e) => e.fieldNotes ?? '').join(' ');
    const publicSafetyScore = evaluatePublicSafetyExposure(inspection.locationLabel, notes);

    // 5. Composite Risk Score (Weighted Formula)
    const compositeRiskScore = Math.round(
      maxSeverityScore * 0.40 +
      criticalityScore * 0.30 +
      cascadingImpactScore * 0.15 +
      publicSafetyScore * 0.15
    );

    // 6. Action Recommendation
    let actionRecommendation: TriageActionRecommendation;
    if (compositeRiskScore >= 80) {
      actionRecommendation = 'IMMEDIATE_DE_ENERGIZE';
    } else if (compositeRiskScore >= 60) {
      actionRecommendation = 'DISPATCH_EMERGENCY_CREW';
    } else if (compositeRiskScore >= 35) {
      actionRecommendation = 'SCHEDULED_REPAIR';
    } else {
      actionRecommendation = 'MONITOR';
    }

    const rationale = `Ranked with composite risk ${compositeRiskScore}/100: ${highestSeverityLabel} defect on Tier-${crit} ${inspection.assetType} at "${inspection.locationLabel}". Cascading downstream risk: ${cascadingImpactScore > 0 ? 'Active' : 'Low'}. Public exposure factor: ${publicSafetyScore}/100.`;

    recommendations.push({
      inspectionId: inspection.id,
      assetId: inspection.assetId,
      assetType: inspection.assetType,
      locationLabel: inspection.locationLabel,
      compositeRiskScore,
      factors: {
        defectSeverityScore: maxSeverityScore,
        criticalityScore,
        cascadingImpactScore,
        publicSafetyScore,
      },
      actionRecommendation,
      rationale,
    });
  }

  // Sort descending by compositeRiskScore
  recommendations.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore);

  // Assign 1-indexed priority ranks
  return recommendations.map((rec, index) => ({
    ...rec,
    priorityRank: index + 1,
  }));
}
