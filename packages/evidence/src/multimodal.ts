// MIRROR — Multimodal Engineering Evidence & Defect Schemas
// Defines structured damage observations, 2D media spatial annotations,
// and risk scoring algorithms combining defect severity with asset criticality.

import type { UUID } from '@mirror/core';
import { generateId } from '@mirror/core';

export type DefectType =
  | 'structural-crack'
  | 'leaning-tilt'
  | 'conductor-down'
  | 'oil-leak'
  | 'thermal-hotspot'
  | 'corrosion-rust'
  | 'vegetation-encroachment'
  | 'washout-erosion'
  | 'insulator-damage';

export type DefectSeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export interface MediaBoundingBox {
  x: number; // 0.0 - 1.0 (normalized horizontal offset)
  y: number; // 0.0 - 1.0 (normalized vertical offset)
  width: number; // 0.0 - 1.0
  height: number; // 0.0 - 1.0
}

export interface DamageObservation {
  id: UUID;
  evidenceId: UUID;
  inspectionId: UUID;
  assetId: string;
  defectType: DefectType;
  component: string; // e.g., "crossarm", "foundation-pad", "bushing-phase-b"
  severity: DefectSeverity;
  spatialAnnotation?: MediaBoundingBox;
  quantitativeReading?: {
    label: string;
    value: number;
    unit: string;
  };
  fieldNotes?: string;
  verifiedByEngineer?: boolean;
}

const SEVERITY_WEIGHTS: Record<DefectSeverity, number> = {
  minor: 1.0,
  moderate: 2.0,
  severe: 3.5,
  critical: 5.0,
};

/**
 * Calculate an operational risk index (1 - 100) combining defect severity with asset criticality.
 * High criticality assets (e.g. Substation, Hospital feeder) with critical defects produce scores >= 85.
 */
export function calculateDefectRiskScore(
  severity: DefectSeverity,
  assetCriticality: 1 | 2 | 3 | 4 | 5
): number {
  const sWeight = SEVERITY_WEIGHTS[severity];
  const rawScore = (sWeight * assetCriticality) / 25; // max 25
  return Math.min(100, Math.round(rawScore * 100));
}

/**
 * Create a validated DamageObservation instance bound to an EvidenceItem.
 */
export function createDamageObservation(
  params: Omit<DamageObservation, 'id'>
): DamageObservation {
  return {
    ...params,
    id: generateId(),
  };
}

/**
 * Filter observations requiring immediate priority response (risk score >= 70).
 */
export function filterHighRiskObservations(
  observations: DamageObservation[],
  assetCriticalityMap: Map<string, 1 | 2 | 3 | 4 | 5>
): Array<{ observation: DamageObservation; riskScore: number }> {
  const highRisk: Array<{ observation: DamageObservation; riskScore: number }> = [];

  for (const obs of observations) {
    const criticality = assetCriticalityMap.get(obs.assetId) ?? 3;
    const score = calculateDefectRiskScore(obs.severity, criticality);
    if (score >= 70) {
      highRisk.push({ observation: obs, riskScore: score });
    }
  }

  return highRisk.sort((a, b) => b.riskScore - a.riskScore);
}
