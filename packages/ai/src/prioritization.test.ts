import { describe, it, expect } from 'vitest';
import { prioritizeInspectionSites } from './prioritization.js';
import type { InspectionRecord, InfrastructureAsset } from '@mirror/core';
import type { DamageObservation } from '@mirror/evidence';

describe('Multi-Factor Decision Prioritization & Triage Framework', () => {
  const assetCritical: InfrastructureAsset = {
    id: 'SUB-NORTH',
    name: 'Hospital Feeder Substation',
    assetType: 'substation',
    criticality: 5,
    location: { label: 'Metro Hospital Access Highway' },
    connectedAssetIds: ['POLE-1'],
  };

  const assetRural: InfrastructureAsset = {
    id: 'POLE-RURAL',
    name: 'Rural Farm Distribution Pole',
    assetType: 'pole',
    criticality: 1,
    location: { label: 'County Road 44 Easement' },
    connectedAssetIds: [],
  };

  const assetMap = new Map<string, InfrastructureAsset>([
    ['SUB-NORTH', assetCritical],
    ['POLE-RURAL', assetRural],
  ]);

  const inspCritical: InspectionRecord = {
    id: 'insp-crit',
    incidentId: 'inc-1',
    inspectorId: 'insp-1',
    assetId: 'SUB-NORTH',
    assetType: 'substation',
    locationLabel: 'Metro Hospital Access Highway',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'local-only',
    evidence: [],
  };

  const inspRural: InspectionRecord = {
    id: 'insp-rural',
    incidentId: 'inc-1',
    inspectorId: 'insp-1',
    assetId: 'POLE-RURAL',
    assetType: 'pole',
    locationLabel: 'County Road 44 Easement',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'local-only',
    evidence: [],
  };

  const obsCritical: DamageObservation = {
    id: 'obs-1',
    evidenceId: 'ev-1',
    inspectionId: 'insp-crit',
    assetId: 'SUB-NORTH',
    defectType: 'conductor-down',
    component: 'main-bus',
    severity: 'critical',
  };

  const obsRural: DamageObservation = {
    id: 'obs-2',
    evidenceId: 'ev-2',
    inspectionId: 'insp-rural',
    assetId: 'POLE-RURAL',
    defectType: 'corrosion-rust',
    component: 'anchor-guy',
    severity: 'minor',
  };

  it('ranks high-criticality emergency as #1 and recommends IMMEDIATE_DE_ENERGIZE', () => {
    const rankings = prioritizeInspectionSites(
      [inspRural, inspCritical],
      [obsCritical, obsRural],
      assetMap
    );

    expect(rankings).toHaveLength(2);

    // Rank 1 must be SUB-NORTH
    const topRank = rankings[0];
    expect(topRank.priorityRank).toBe(1);
    expect(topRank.assetId).toBe('SUB-NORTH');
    expect(topRank.compositeRiskScore).toBeGreaterThanOrEqual(80);
    expect(topRank.actionRecommendation).toBe('IMMEDIATE_DE_ENERGIZE');
    expect(topRank.factors.defectSeverityScore).toBe(100);
    expect(topRank.factors.criticalityScore).toBe(100);
    expect(topRank.factors.publicSafetyScore).toBe(100); // Hospital/highway

    // Rank 2 must be POLE-RURAL
    const secondRank = rankings[1];
    expect(secondRank.priorityRank).toBe(2);
    expect(secondRank.assetId).toBe('POLE-RURAL');
    expect(secondRank.compositeRiskScore).toBeLessThan(35);
    expect(secondRank.actionRecommendation).toBe('MONITOR');
  });
});
