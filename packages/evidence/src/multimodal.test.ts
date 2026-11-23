import { describe, it, expect } from 'vitest';
import {
  calculateDefectRiskScore,
  createDamageObservation,
  filterHighRiskObservations,
  type DamageObservation,
} from './multimodal.js';

describe('Multimodal Engineering Evidence & Defect Schemas', () => {
  it('calculateDefectRiskScore computes normalized risk scale (1 - 100)', () => {
    // Critical (5.0) * Criticality 5 = 25 / 25 -> 100
    expect(calculateDefectRiskScore('critical', 5)).toBe(100);

    // Minor (1.0) * Criticality 1 = 1 / 25 -> 4
    expect(calculateDefectRiskScore('minor', 1)).toBe(4);

    // Severe (3.5) * Criticality 5 = 17.5 / 25 -> 70
    expect(calculateDefectRiskScore('severe', 5)).toBe(70);

    // Moderate (2.0) * Criticality 3 = 6 / 25 -> 24
    expect(calculateDefectRiskScore('moderate', 3)).toBe(24);
  });

  it('createDamageObservation creates structured record with unique ID and spatial box', () => {
    const obs = createDamageObservation({
      evidenceId: 'ev-1',
      inspectionId: 'insp-1',
      assetId: 'POLE-42',
      defectType: 'structural-crack',
      component: 'crossarm-east',
      severity: 'severe',
      spatialAnnotation: { x: 0.25, y: 0.4, width: 0.15, height: 0.1 },
      quantitativeReading: { label: 'Crack Width', value: 8.5, unit: 'mm' },
      fieldNotes: 'Longitudinal split along grain',
    });

    expect(obs.id).toBeDefined();
    expect(obs.assetId).toBe('POLE-42');
    expect(obs.defectType).toBe('structural-crack');
    expect(obs.spatialAnnotation?.x).toBe(0.25);
    expect(obs.quantitativeReading?.value).toBe(8.5);
  });

  it('filterHighRiskObservations identifies and ranks critical alerts', () => {
    const criticalityMap = new Map<string, 1 | 2 | 3 | 4 | 5>([
      ['SUB-MAIN', 5],
      ['POLE-MINOR', 2],
      ['HOSPITAL-FEEDER', 5],
    ]);

    const obsList: DamageObservation[] = [
      {
        id: '1',
        evidenceId: 'e1',
        inspectionId: 'i1',
        assetId: 'POLE-MINOR',
        defectType: 'vegetation-encroachment',
        component: 'span',
        severity: 'minor', // score = 8
      },
      {
        id: '2',
        evidenceId: 'e2',
        inspectionId: 'i2',
        assetId: 'SUB-MAIN',
        defectType: 'conductor-down',
        component: 'bay-3',
        severity: 'critical', // score = 100
      },
      {
        id: '3',
        evidenceId: 'e3',
        inspectionId: 'i3',
        assetId: 'HOSPITAL-FEEDER',
        defectType: 'oil-leak',
        component: 'transformer',
        severity: 'severe', // score = 70
      },
    ];

    const alerts = filterHighRiskObservations(obsList, criticalityMap);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].observation.assetId).toBe('SUB-MAIN');
    expect(alerts[0].riskScore).toBe(100);
    expect(alerts[1].observation.assetId).toBe('HOSPITAL-FEEDER');
    expect(alerts[1].riskScore).toBe(70);
  });
});
