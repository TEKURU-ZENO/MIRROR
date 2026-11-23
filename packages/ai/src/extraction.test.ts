import { describe, it, expect } from 'vitest';
import {
  extractEntitiesFromEvidenceItem,
  extractMeasurementsFromEvidence,
  extractEntitiesFromInspection,
} from './extraction.js';
import type { EvidenceItem, InspectionRecord } from '@mirror/core';

describe('Structured Evidence Entity Extraction', () => {
  const dummyItem: EvidenceItem = {
    id: 'ev-item-001',
    inspectionId: 'insp-001',
    type: 'photo',
    storageRef: 'local://test/1',
    capturedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    checksum: 'a'.repeat(64),
    fieldNotes: 'Inspected POLE-42B. Severe cracking observed near base with 14 deg tilt. Bushing oil leak detected.',
  };

  it('extracts asset IDs, defects, and measurements from field notes', () => {
    const entities = extractEntitiesFromEvidenceItem(dummyItem);

    expect(entities.length).toBeGreaterThanOrEqual(3);

    // Verify Asset Tag
    const assetEntity = entities.find((e) => e.value === 'POLE-42B');
    expect(assetEntity).toBeDefined();
    expect(assetEntity?.entityType).toBe('asset');
    expect(assetEntity?.category).toBe('asset-id');
    expect(assetEntity?.sourceEvidenceId).toBe(dummyItem.id);
    expect(assetEntity?.contextSnippet).toContain('POLE-42B');

    // Verify Defect (cracking)
    const defect = entities.find((e) => e.value.includes('crack'));
    expect(defect).toBeDefined();
    expect(defect?.category).toBe('defect');
    expect(defect?.sourceEvidenceId).toBe(dummyItem.id);

    // Verify Measurement
    const measurement = entities.find((e) => e.value.includes('14 deg'));
    expect(measurement).toBeDefined();
    expect(measurement?.category).toBe('measurement');
    expect(measurement?.sourceEvidenceId).toBe(dummyItem.id);
  });

  it('handles empty or missing field notes cleanly', () => {
    const emptyItem: EvidenceItem = {
      ...dummyItem,
      id: 'ev-empty',
      fieldNotes: undefined,
    };
    expect(extractEntitiesFromEvidenceItem(emptyItem)).toEqual([]);
  });

  it('extractMeasurementsFromEvidence extracts numeric values and normalized units', () => {
    const measItem: EvidenceItem = {
      ...dummyItem,
      id: 'ev-meas',
      fieldNotes: 'Pole tilt measured at 12.5 degrees. Transformer operating at 45 psi with 13.8 kV secondary.',
    };

    const measurements = extractMeasurementsFromEvidence(measItem);
    expect(measurements.length).toBe(3);

    expect(measurements[0].value).toBe(12.5);
    expect(measurements[0].unit).toBe('deg');
    expect(measurements[0].label).toBe('Lean Angle');
    expect(measurements[0].sourceEvidenceId).toBe('ev-meas');

    expect(measurements[1].value).toBe(45);
    expect(measurements[1].unit).toBe('psi');
    expect(measurements[1].label).toBe('Oil Pressure');

    expect(measurements[2].value).toBe(13.8);
    expect(measurements[2].unit).toBe('kV');
  });

  it('extractEntitiesFromInspection aggregates findings across multiple items', () => {
    const inspection: InspectionRecord = {
      id: 'insp-main',
      incidentId: 'inc-1',
      inspectorId: 'ins-1',
      assetId: 'POLE-42',
      assetType: 'pole',
      locationLabel: 'North Grid Site',
      capturedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      syncStatus: 'local-only',
      evidence: [],
    };

    const item1: EvidenceItem = {
      ...dummyItem,
      id: 'item-1',
      inspectionId: inspection.id,
      fieldNotes: 'Base crack on POLE-42.',
    };

    const item2: EvidenceItem = {
      ...dummyItem,
      id: 'item-2',
      inspectionId: inspection.id,
      fieldNotes: 'Leaning 8 deg to the east.',
    };

    const result = extractEntitiesFromInspection(inspection, [item1, item2]);

    expect(result.entities.length).toBeGreaterThanOrEqual(2);
    expect(result.measurements).toHaveLength(1);
    expect(result.totalGroundedEvidence).toBe(2);
  });
});
