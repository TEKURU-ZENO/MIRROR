import { describe, it, expect } from 'vitest';
import { correlateCrossInspectionEvidence } from './crossInspection.js';
import type { InspectionRecord } from '@mirror/core';
import type { DamageObservation } from '@mirror/evidence';

describe('Cross-Inspection Systemic Intelligence Correlator', () => {
  const dummyInsp1: InspectionRecord = {
    id: 'insp-1',
    incidentId: 'inc-storm-2026',
    inspectorId: 'ins-1',
    assetId: 'POLE-10',
    assetType: 'pole',
    locationLabel: 'North Feeder Span 1',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'local-only',
    evidence: [],
  };

  const dummyInsp2: InspectionRecord = {
    id: 'insp-2',
    incidentId: 'inc-storm-2026',
    inspectorId: 'ins-2',
    assetId: 'POLE-11',
    assetType: 'pole',
    locationLabel: 'North Feeder Span 2',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'local-only',
    evidence: [],
  };

  const dummyInsp3: InspectionRecord = {
    id: 'insp-3',
    incidentId: 'inc-storm-2026',
    inspectorId: 'ins-3',
    assetId: 'SUB-1',
    assetType: 'substation',
    locationLabel: 'North Substation',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    syncStatus: 'local-only',
    evidence: [],
  };

  const obsList: DamageObservation[] = [
    {
      id: 'o1',
      evidenceId: 'ev-1',
      inspectionId: 'insp-1',
      assetId: 'POLE-10',
      defectType: 'structural-crack',
      component: 'crossarm',
      severity: 'severe',
    },
    {
      id: 'o2',
      evidenceId: 'ev-2',
      inspectionId: 'insp-2',
      assetId: 'POLE-11',
      defectType: 'structural-crack',
      component: 'crossarm',
      severity: 'severe',
    },
    {
      id: 'o3',
      evidenceId: 'ev-3',
      inspectionId: 'insp-3',
      assetId: 'SUB-1',
      defectType: 'conductor-down',
      component: 'bay-1',
      severity: 'critical',
    },
  ];

  it('detects systemic crossarm cracking pattern across multiple inspection sites', () => {
    const report = correlateCrossInspectionEvidence(
      'inc-storm-2026',
      [dummyInsp1, dummyInsp2, dummyInsp3],
      obsList
    );

    expect(report.totalInspectionsAnalyzed).toBe(3);
    expect(report.patterns.length).toBeGreaterThanOrEqual(1);

    const pattern = report.patterns.find((p) => p.title.includes('crossarm'));
    expect(pattern).toBeDefined();
    expect(pattern?.patternType).toBe('common-component-defect');
    expect(pattern?.affectedAssetIds).toContain('POLE-10');
    expect(pattern?.affectedAssetIds).toContain('POLE-11');
    expect(pattern?.evidenceIds).toContain('ev-1');
    expect(pattern?.evidenceIds).toContain('ev-2');
    expect(pattern?.preventativeRecommendation).toContain('bulletin');

    expect(report.estimatedRegionalDamageLevel).toBe('severe');
    expect(report.hypothesizedRootCause).toContain('wind shear');
  });
});
