import { describe, it, expect } from 'vitest';
import {
  evaluateDamageAssessmentSuite,
  getGroundTruthIncidentDataset,
} from './damageAssessmentEval.js';
import { assessDamageFromNotes } from './damageAssessment.js';

describe('Damage Assessment Task-Accuracy Benchmark', () => {
  it('executes full evaluation suite against labeled ground-truth incidents with zero critical under-triage', () => {
    const report = evaluateDamageAssessmentSuite();

    expect(report.totalCases).toBe(10);
    // Life-safety invariant: A critical/severe defect must NEVER be under-triaged to moderate/minor
    expect(report.criticalUnderTriageRate).toBe(0.0);

    // Accuracy metrics
    expect(report.defectClassificationAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(report.severityClassificationAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(report.actionConcordance).toBeGreaterThanOrEqual(0.90);
    expect(report.severityMeanAbsoluteError).toBeLessThan(0.2);
    expect(report.measurementExtractionRecall).toBeGreaterThanOrEqual(0.85);

    // Verify all individual cases are logged
    expect(report.caseResults.length).toBe(10);
  });

  it('correctly assesses a high-voltage transformer dielectric oil leak and lightning flashover', () => {
    const dataset = getGroundTruthIncidentDataset();
    const xfmrCase = dataset.find((c) => c.id === 'INC-XFMR-01')!;

    const assessment = assessDamageFromNotes(xfmrCase.input);
    expect(assessment.primaryDefect).toBe('oil-leak');
    expect(assessment.severity).toBe('critical');
    expect(assessment.actionRecommendation).toBe('IMMEDIATE_DE_ENERGIZE');
    expect(assessment.affectedComponent).toBe('bushing');
    expect(assessment.safetyHazard).toBe(true);

    const oilReading = assessment.quantitativeReadings.find((r) => r.unit === 'liters/minute');
    expect(oilReading).toBeDefined();
    expect(oilReading?.value).toBe(2.0);
  });

  it('correctly identifies a 500kV transmission tower structural buckling with imminent collapse risk', () => {
    const dataset = getGroundTruthIncidentDataset();
    const towerCase = dataset.find((c) => c.id === 'INC-TOWER-02')!;

    const assessment = assessDamageFromNotes(towerCase.input);
    expect(assessment.primaryDefect).toBe('leaning-tilt');
    expect(assessment.severity).toBe('critical');
    expect(assessment.actionRecommendation).toBe('IMMEDIATE_DE_ENERGIZE');
    expect(assessment.safetyHazard).toBe(true);
  });

  it('correctly identifies a downed energized distribution conductor in a residential street', () => {
    const dataset = getGroundTruthIncidentDataset();
    const feederCase = dataset.find((c) => c.id === 'INC-FEEDER-04')!;

    const assessment = assessDamageFromNotes(feederCase.input);
    expect(assessment.primaryDefect).toBe('conductor-down');
    expect(assessment.severity).toBe('critical');
    expect(assessment.actionRecommendation).toBe('IMMEDIATE_DE_ENERGIZE');
    expect(assessment.safetyHazard).toBe(true);
  });

  it('correctly identifies severe thermal hotspot on 115kV disconnect switch and extracts temperature', () => {
    const dataset = getGroundTruthIncidentDataset();
    const switchCase = dataset.find((c) => c.id === 'INC-SWITCH-05')!;

    const assessment = assessDamageFromNotes(switchCase.input);
    expect(assessment.primaryDefect).toBe('thermal-hotspot');
    expect(assessment.severity).toBe('severe');
    expect(assessment.actionRecommendation).toBe('DISPATCH_EMERGENCY_CREW');

    const tempReading = assessment.quantitativeReadings.find((r) => r.unit === '°C');
    expect(tempReading).toBeDefined();
    expect(tempReading?.value).toBe(138);
  });

  it('correctly classifies superficial porcelain glaze chipping as minor with monitor action', () => {
    const dataset = getGroundTruthIncidentDataset();
    const insulCase = dataset.find((c) => c.id === 'INC-INSUL-08')!;

    const assessment = assessDamageFromNotes(insulCase.input);
    expect(assessment.primaryDefect).toBe('insulator-damage');
    expect(assessment.severity).toBe('minor');
    expect(assessment.actionRecommendation).toBe('MONITOR');
    expect(assessment.safetyHazard).toBe(false);
  });
});
