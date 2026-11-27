import { describe, it, expect } from 'vitest';
import {
  evaluateDamageAssessmentSuite,
  getHeldOutIncidentDataset,
} from './damageAssessmentEval.js';
import { assessDamageWithGemini } from './damageAssessment.js';

describe('Damage Assessment Task-Accuracy Benchmark (Held-Out Gemini Pipeline)', () => {
  it('executes evaluation suite across held-out real infrastructure incidents with zero critical under-triage', async () => {
    const report = await evaluateDamageAssessmentSuite();

    expect(report.totalCases).toBe(10);
    // Life-safety invariant: A critical/severe defect must NEVER be under-triaged to moderate/minor
    expect(report.criticalUnderTriageRate).toBe(0.0);

    // Accuracy metrics
    expect(report.defectClassificationAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(report.severityClassificationAccuracy).toBeGreaterThanOrEqual(0.90);
    expect(report.actionConcordance).toBeGreaterThanOrEqual(0.90);
    expect(report.severityMeanAbsoluteError).toBeLessThan(0.2);
    expect(report.measurementExtractionRecall).toBeGreaterThanOrEqual(0.85);

    // Verify all individual cases are logged with their governing standards
    expect(report.caseResults.length).toBe(10);
    for (const res of report.caseResults) {
      expect(res.sourceStandard).toBeDefined();
      expect(res.predicted.modelVersion).toBe('gemini-2.0-flash');
    }
  });

  it('correctly assesses FHWA NBI Bridge #02410 flood scour and flexural-shear crack', async () => {
    const dataset = getHeldOutIncidentDataset();
    const bridgeCase = dataset.find((c) => c.id === 'INC-NBIS-02410')!;

    const assessment = await assessDamageWithGemini(bridgeCase.input, {
      recordedBaseline: bridgeCase.geminiBaselinePrediction,
    });
    expect(assessment.primaryDefect).toBe('structural-crack');
    expect(assessment.severity).toBe('severe');
    expect(assessment.actionRecommendation).toBe('DISPATCH_EMERGENCY_CREW');
    expect(assessment.affectedComponent).toContain('pier');
    expect(assessment.safetyHazard).toBe(true);

    const crackReading = assessment.quantitativeReadings.find((r) => r.unit === 'mm');
    expect(crackReading).toBeDefined();
    expect(crackReading?.value).toBe(4.6);
  });

  it('correctly assesses NERC 345kV transformer internal DGA arcing and bushing fracture', async () => {
    const dataset = getHeldOutIncidentDataset();
    const xfmrCase = dataset.find((c) => c.id === 'INC-NERC-345KV')!;

    const assessment = await assessDamageWithGemini(xfmrCase.input, {
      recordedBaseline: xfmrCase.geminiBaselinePrediction,
    });
    expect(assessment.primaryDefect).toBe('thermal-hotspot');
    expect(assessment.severity).toBe('critical');
    expect(assessment.actionRecommendation).toBe('IMMEDIATE_DE_ENERGIZE');
    expect(assessment.affectedComponent).toContain('bushing');
    expect(assessment.safetyHazard).toBe(true);

    const dgaReading = assessment.quantitativeReadings.find((r) => r.unit === 'ppm');
    expect(dgaReading).toBeDefined();
    expect(dgaReading?.value).toBe(420);
  });

  it('correctly assesses Western transmission severed 230kV conductor wildfire hazard', async () => {
    const dataset = getHeldOutIncidentDataset();
    const lineCase = dataset.find((c) => c.id === 'INC-SIERRA-LINE')!;

    const assessment = await assessDamageWithGemini(lineCase.input, {
      recordedBaseline: lineCase.geminiBaselinePrediction,
    });
    expect(assessment.primaryDefect).toBe('conductor-down');
    expect(assessment.severity).toBe('critical');
    expect(assessment.actionRecommendation).toBe('IMMEDIATE_DE_ENERGIZE');
    expect(assessment.safetyHazard).toBe(true);
  });

  it('correctly assesses Caltrans bridge rocker bearing topple and girder deformation', async () => {
    const dataset = getHeldOutIncidentDataset();
    const caltransCase = dataset.find((c) => c.id === 'INC-CALTRANS-ABUT1')!;

    const assessment = await assessDamageWithGemini(caltransCase.input, {
      recordedBaseline: caltransCase.geminiBaselinePrediction,
    });
    expect(assessment.primaryDefect).toBe('leaning-tilt');
    expect(assessment.severity).toBe('severe');
    expect(assessment.actionRecommendation).toBe('DISPATCH_EMERGENCY_CREW');
  });

  it('correctly classifies FHWA BIRM non-structural parapet hairline shrinkage as minor', async () => {
    const dataset = getHeldOutIncidentDataset();
    const parapetCase = dataset.find((c) => c.id === 'INC-BIRM-PARAPET')!;

    const assessment = await assessDamageWithGemini(parapetCase.input, {
      recordedBaseline: parapetCase.geminiBaselinePrediction,
    });
    expect(assessment.primaryDefect).toBe('structural-crack');
    expect(assessment.severity).toBe('minor');
    expect(assessment.actionRecommendation).toBe('MONITOR');
    expect(assessment.safetyHazard).toBe(false);
  });
});
