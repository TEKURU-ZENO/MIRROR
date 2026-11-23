// MIRROR — Ground-Truth Labeled Infrastructure Damage Evaluation Suite
// Evaluates AI damage assessment task-accuracy against expert-labeled incident ground truth:
// Defect classification accuracy, severity accuracy, critical under-triage rate,
// action concordance, and quantitative measurement extraction recall.

import type { DefectType, DefectSeverity } from '@mirror/evidence';
import type { TriageActionRecommendation } from './prioritization.js';
import {
  assessDamageFromNotes,
  type DamageAssessmentInput,
  type AssessedDamageResult,
} from './damageAssessment.js';

export interface ExpectedMeasurement {
  labelKeyword: string;
  expectedValue: number;
  expectedUnit: string;
}

export interface LabeledIncidentCase {
  id: string;
  title: string;
  input: DamageAssessmentInput;
  groundTruth: {
    primaryDefect: DefectType;
    acceptableDefectAlternatives?: DefectType[];
    severity: DefectSeverity;
    expectedAction: TriageActionRecommendation;
    expectedComponentKeyword: string;
    expectedMeasurements?: ExpectedMeasurement[];
    expertRationale: string;
  };
}

export interface CaseEvaluationResult {
  caseId: string;
  title: string;
  predicted: AssessedDamageResult;
  groundTruth: LabeledIncidentCase['groundTruth'];
  defectMatch: boolean;
  severityMatch: boolean;
  actionMatch: boolean;
  underTriaged: boolean; // True if ground truth was critical/severe but predicted moderate/minor
  measurementsExtractedCount: number;
  measurementsExpectedCount: number;
  notes: string;
}

export interface DamageAssessmentEvaluationReport {
  evaluatedAt: string;
  totalCases: number;
  defectClassificationAccuracy: number; // 0.0 - 1.0
  severityClassificationAccuracy: number; // 0.0 - 1.0
  severityMeanAbsoluteError: number;     // 0.0 - 3.0 (tier distance)
  criticalUnderTriageRate: number;       // 0.0 - 1.0 (Safety Metric: must be 0%)
  actionConcordance: number;             // 0.0 - 1.0
  measurementExtractionRecall: number;   // 0.0 - 1.0
  componentAccuracy: number;             // 0.0 - 1.0
  caseResults: CaseEvaluationResult[];
  summary: string;
}

const SEVERITY_TIERS: Record<DefectSeverity, number> = {
  minor: 1,
  moderate: 2,
  severe: 3,
  critical: 4,
};

/**
 * Benchmark labeled ground-truth incident dataset curated with licensed Professional Engineers.
 */
export function getGroundTruthIncidentDataset(): LabeledIncidentCase[] {
  return [
    {
      id: 'INC-XFMR-01',
      title: 'Substation Transformer Bushing Flashover & Oil Leak',
      input: {
        assetId: 'SUB-CASCADE-XFMR-T1',
        assetType: 'transformer',
        assetCriticality: 5,
        locationLabel: 'Cascade Substation Main Yard',
        fieldNotes:
          'Phase B 230kV bushing porcelain shattered from lightning strike. Active dielectric oil leak pooling on gravel containment pad at approx 2.0 liters/minute. Heavy arcing flashover residues on transformer tank. Transformer humming irregularly.',
      },
      groundTruth: {
        primaryDefect: 'oil-leak',
        acceptableDefectAlternatives: ['thermal-hotspot', 'insulator-damage'],
        severity: 'critical',
        expectedAction: 'IMMEDIATE_DE_ENERGIZE',
        expectedComponentKeyword: 'bushing',
        expectedMeasurements: [
          { labelKeyword: 'leak', expectedValue: 2.0, expectedUnit: 'liters/minute' },
        ],
        expertRationale:
          'Active dielectric oil leak + shattered bushing is an imminent catastrophic fire/explosion risk under NERC standards.',
      },
    },
    {
      id: 'INC-TOWER-02',
      title: '500kV Transmission Tower Structural Buckling',
      input: {
        assetId: 'TX-CORRIDOR-P502',
        assetType: 'transmission-tower',
        assetCriticality: 5,
        locationLabel: 'North Mountain Transmission Ridge',
        fieldNotes:
          'Tower leg member L3 severely buckled and tilted 18 degrees out of plumb following slope subsidence. Diagonal cross-bracing sheared at gusset plate. Structure at imminent risk of collapse under line tension.',
      },
      groundTruth: {
        primaryDefect: 'leaning-tilt',
        acceptableDefectAlternatives: ['structural-crack'],
        severity: 'critical',
        expectedAction: 'IMMEDIATE_DE_ENERGIZE',
        expectedComponentKeyword: 'tower-leg',
        expectedMeasurements: [
          { labelKeyword: 'tilt', expectedValue: 18, expectedUnit: 'degrees' },
        ],
        expertRationale:
          '18 degree leg deformation on 500kV lattice tower presents imminent line drop and corridor cascading collapse.',
      },
    },
    {
      id: 'INC-BRG-03',
      title: 'Highway Overpass Bridge Pier Diagonal Shear Cracking',
      input: {
        assetId: 'BRG-INTERSTATE-PIER4',
        assetType: 'bridge-pier',
        assetCriticality: 4,
        locationLabel: 'Interstate 84 Crossing Pier 4',
        fieldNotes:
          'Pier 4 column displaying diagonal shear crack measuring 6.5 mm in width propagating at 45 degree angle through concrete core. Concrete cover spalled with corroded rebar visible.',
      },
      groundTruth: {
        primaryDefect: 'structural-crack',
        acceptableDefectAlternatives: ['corrosion-rust'],
        severity: 'severe',
        expectedAction: 'DISPATCH_EMERGENCY_CREW',
        expectedComponentKeyword: 'pier-column',
        expectedMeasurements: [
          { labelKeyword: 'crack', expectedValue: 6.5, expectedUnit: 'mm' },
        ],
        expertRationale:
          '6.5 mm diagonal shear crack in reinforced concrete pier exceeds AASHTO 1.5mm structural safety threshold.',
      },
    },
    {
      id: 'INC-FEEDER-04',
      title: '13.8kV Distribution Feeder Conductor Down in Residential Street',
      input: {
        assetId: 'DIST-FEEDER-P881',
        assetType: 'distribution-pole',
        assetCriticality: 3,
        locationLabel: 'Maple & 14th Ave Residential Crossing',
        fieldNotes:
          '13.8kV primary phase conductor down, severed by fallen tree branch between poles. Conductor lying across sidewalk sparking intermittently near residential driveways.',
      },
      groundTruth: {
        primaryDefect: 'conductor-down',
        acceptableDefectAlternatives: ['vegetation-encroachment'],
        severity: 'critical',
        expectedAction: 'IMMEDIATE_DE_ENERGIZE',
        expectedComponentKeyword: 'conductor-span',
        expertRationale:
          'Downed energized conductor in pedestrian street is an immediate life-safety electrocution hazard.',
      },
    },
    {
      id: 'INC-SWITCH-05',
      title: 'Substation 115kV Disconnect Switch Severe Thermal Hotspot',
      input: {
        assetId: 'SUB-CASCADE-SW-115',
        assetType: 'substation',
        assetCriticality: 4,
        locationLabel: 'Cascade Substation Bay 2',
        fieldNotes:
          'Thermography infrared scan reveals 115kV disconnect switch jaw contact running at 138°C with 64°C delta-T above ambient reference. Moderate copper oxidation, no active smoke or arcing observed.',
      },
      groundTruth: {
        primaryDefect: 'thermal-hotspot',
        acceptableDefectAlternatives: ['corrosion-rust'],
        severity: 'severe',
        expectedAction: 'DISPATCH_EMERGENCY_CREW',
        expectedComponentKeyword: 'disconnect-switch',
        expectedMeasurements: [
          { labelKeyword: 'temperature', expectedValue: 138, expectedUnit: '°C' },
        ],
        expertRationale:
          '64°C delta-T on high-voltage switch contact indicates severe contact resistance and imminent weld/flashover failure under IEEE 1048.',
      },
    },
    {
      id: 'INC-POLE-06',
      title: 'Distribution Wood Pole Groundline Rot & Guy Wire Corrosion',
      input: {
        assetId: 'DIST-POLE-4412',
        assetType: 'distribution-pole',
        assetCriticality: 2,
        locationLabel: 'Rural Lateral Route 9',
        fieldNotes:
          'Wood pole base shows localized fungal rot extending 8.0 mm deep at groundline. Guy wire anchor shows mild surface corrosion on turnbuckle. Pole remains plumb with 0 deg tilt.',
      },
      groundTruth: {
        primaryDefect: 'corrosion-rust',
        acceptableDefectAlternatives: ['washout-erosion'],
        severity: 'moderate',
        expectedAction: 'SCHEDULED_REPAIR',
        expectedComponentKeyword: 'pole-base',
        expectedMeasurements: [
          { labelKeyword: 'rot', expectedValue: 8.0, expectedUnit: 'mm' },
        ],
        expertRationale:
          'Localized 8mm rot on 350mm diameter pole retains >85% bending strength; requires scheduled reinforcement, not emergency shutdown.',
      },
    },
    {
      id: 'INC-WASH-07',
      title: 'Substation Perimeter Embankment Storm Washout & Drainage Erosion',
      input: {
        assetId: 'SUB-VALLEY-DRAIN-01',
        assetType: 'substation',
        assetCriticality: 3,
        locationLabel: 'Valley View Substation North Boundary',
        fieldNotes:
          'Storm runoff caused 1.2 m gully erosion along north drainage ditch, 5 meters away from perimeter security fence. Yard gravel foundation intact, control house footing uncompromised.',
      },
      groundTruth: {
        primaryDefect: 'washout-erosion',
        severity: 'moderate',
        expectedAction: 'SCHEDULED_REPAIR',
        expectedComponentKeyword: 'drainage-embankment',
        expectedMeasurements: [
          { labelKeyword: 'erosion', expectedValue: 1.2, expectedUnit: 'm' },
        ],
        expertRationale:
          'Gully erosion is 5m clear of energized yard; civil grading required before next wet cycle.',
      },
    },
    {
      id: 'INC-INSUL-08',
      title: 'Transmission Porcelain Insulator Glaze Chipping & Salt Crust',
      input: {
        assetId: 'TX-LINE-INS-04',
        assetType: 'transmission-tower',
        assetCriticality: 3,
        locationLabel: 'Coastal Transmission Span 14',
        fieldNotes:
          'Suspension porcelain bell insulator shows minor glaze chipping on shed skirt (< 5 mm diameter). Heavy coastal salt dust accumulation. No electrical tracking, flashover puncture, or corona discharge detected.',
      },
      groundTruth: {
        primaryDefect: 'insulator-damage',
        severity: 'minor',
        expectedAction: 'MONITOR',
        expectedComponentKeyword: 'insulator-string',
        expertRationale:
          'Surface glaze chip under 5mm without electrical tracking does not compromise dielectric breakdown rating; routine washing scheduled.',
      },
    },
    {
      id: 'INC-VENT-09',
      title: 'Substation Battery Room Hydrogen Vent Fan Motor Seized',
      input: {
        assetId: 'SUB-BATTERY-EXH-01',
        assetType: 'substation',
        assetCriticality: 4,
        locationLabel: 'Control House Battery Room',
        fieldNotes:
          'Station 125V DC battery bank room auxiliary exhaust fan motor seized. Hydrogen concentration sensor reading 1.8% concentration approaching the 2.0% LEL lower explosive limit.',
      },
      groundTruth: {
        primaryDefect: 'thermal-hotspot',
        severity: 'severe',
        expectedAction: 'DISPATCH_EMERGENCY_CREW',
        expectedComponentKeyword: 'ventilation-fan',
        expectedMeasurements: [
          { labelKeyword: 'gas concentration', expectedValue: 1.8, expectedUnit: '%' },
        ],
        expertRationale:
          'Hydrogen gas accumulation at 1.8% in enclosed DC control house creates explosion hazard; ventilation must be restored urgently.',
      },
    },
    {
      id: 'INC-BEAR-10',
      title: 'Bridge Bearing Pad Horizontal Shear Displacement',
      input: {
        assetId: 'BRG-EAST-ABUT1',
        assetType: 'bridge-pier',
        assetCriticality: 3,
        locationLabel: 'East River Bridge Abutment 1',
        fieldNotes:
          'Elastomeric bearing pad exhibits 12 mm horizontal shear deformation. Concrete pedestal exhibits minor hairline vertical shrinkage crack measuring 0.2 mm width, structurally stable.',
      },
      groundTruth: {
        primaryDefect: 'leaning-tilt',
        acceptableDefectAlternatives: ['structural-crack'],
        severity: 'moderate',
        expectedAction: 'SCHEDULED_REPAIR',
        expectedComponentKeyword: 'bearing-pad',
        expectedMeasurements: [
          { labelKeyword: 'shear deformation', expectedValue: 12, expectedUnit: 'mm' },
        ],
        expertRationale:
          '12 mm shear displacement on 60mm pad is within allowable seismic thermal travel; pedestal crack is non-structural.',
      },
    },
  ];
}

/**
 * Runs the full damage assessment evaluation suite against labeled ground truth.
 */
export function evaluateDamageAssessmentSuite(
  customCases?: LabeledIncidentCase[]
): DamageAssessmentEvaluationReport {
  const cases = customCases ?? getGroundTruthIncidentDataset();
  const caseResults: CaseEvaluationResult[] = [];

  let correctDefects = 0;
  let correctSeverities = 0;
  let correctActions = 0;
  let correctComponents = 0;
  let underTriagedCount = 0;
  let totalSeverityDistance = 0;
  let totalExpectedMeasurements = 0;
  let totalExtractedMeasurements = 0;

  for (const c of cases) {
    const predicted = assessDamageFromNotes(c.input);

    // 1. Defect Match
    const defectMatch =
      predicted.primaryDefect === c.groundTruth.primaryDefect ||
      (c.groundTruth.acceptableDefectAlternatives?.includes(predicted.primaryDefect) ?? false) ||
      predicted.secondaryDefects.includes(c.groundTruth.primaryDefect);

    if (defectMatch) correctDefects++;

    // 2. Severity Match
    const severityMatch = predicted.severity === c.groundTruth.severity;
    if (severityMatch) correctSeverities++;

    // Distance in severity tiers
    const predictedTier = SEVERITY_TIERS[predicted.severity];
    const expectedTier = SEVERITY_TIERS[c.groundTruth.severity];
    const dist = Math.abs(predictedTier - expectedTier);
    totalSeverityDistance += dist;

    // Critical Under-Triage Check (Life-Safety Metric):
    // If ground truth is critical/severe, but prediction is moderate/minor
    const isDangerousUnderTriage = expectedTier >= 3 && predictedTier <= 2;
    if (isDangerousUnderTriage) underTriagedCount++;

    // 3. Action Match
    const actionMatch = predicted.actionRecommendation === c.groundTruth.expectedAction;
    if (actionMatch) correctActions++;

    // 4. Component Identification
    const componentMatch = predicted.affectedComponent
      .toLowerCase()
      .includes(c.groundTruth.expectedComponentKeyword.toLowerCase());
    if (componentMatch) correctComponents++;

    // 5. Measurements Extraction
    const expectedMeasures = c.groundTruth.expectedMeasurements ?? [];
    totalExpectedMeasurements += expectedMeasures.length;

    let matchedMeasurements = 0;
    for (const exp of expectedMeasures) {
      const found = predicted.quantitativeReadings.some(
        (q) => Math.abs(q.value - exp.expectedValue) < 0.01 && q.unit.toLowerCase() === exp.expectedUnit.toLowerCase()
      );
      if (found) matchedMeasurements++;
    }
    totalExtractedMeasurements += matchedMeasurements;

    caseResults.push({
      caseId: c.id,
      title: c.title,
      predicted,
      groundTruth: c.groundTruth,
      defectMatch,
      severityMatch,
      actionMatch,
      underTriaged: isDangerousUnderTriage,
      measurementsExtractedCount: matchedMeasurements,
      measurementsExpectedCount: expectedMeasures.length,
      notes: defectMatch && severityMatch && actionMatch
        ? 'All dimensions aligned with PE consensus.'
        : `Divergence: Defect=${defectMatch}, Severity=${severityMatch} (pred=${predicted.severity}, exp=${c.groundTruth.severity}), Action=${actionMatch}`,
    });
  }

  const total = cases.length;
  const criticalOrSevereCases = cases.filter(
    (c) => SEVERITY_TIERS[c.groundTruth.severity] >= 3
  ).length;

  const defectClassificationAccuracy = Number((correctDefects / total).toFixed(4));
  const severityClassificationAccuracy = Number((correctSeverities / total).toFixed(4));
  const severityMeanAbsoluteError = Number((totalSeverityDistance / total).toFixed(3));
  const criticalUnderTriageRate = criticalOrSevereCases > 0
    ? Number((underTriagedCount / criticalOrSevereCases).toFixed(4))
    : 0;
  const actionConcordance = Number((correctActions / total).toFixed(4));
  const componentAccuracy = Number((correctComponents / total).toFixed(4));
  const measurementExtractionRecall = totalExpectedMeasurements > 0
    ? Number((totalExtractedMeasurements / totalExpectedMeasurements).toFixed(4))
    : 1.0;

  const summary =
    `Evaluated ${total} ground-truth incident cases: ` +
    `Defect Accuracy: ${(defectClassificationAccuracy * 100).toFixed(1)}%, ` +
    `Severity Accuracy: ${(severityClassificationAccuracy * 100).toFixed(1)}%, ` +
    `Critical Under-Triage: ${(criticalUnderTriageRate * 100).toFixed(1)}% (Target: 0%), ` +
    `Action Concordance: ${(actionConcordance * 100).toFixed(1)}%, ` +
    `Measurement Recall: ${(measurementExtractionRecall * 100).toFixed(1)}%.`;

  return {
    evaluatedAt: new Date().toISOString(),
    totalCases: total,
    defectClassificationAccuracy,
    severityClassificationAccuracy,
    severityMeanAbsoluteError,
    criticalUnderTriageRate,
    actionConcordance,
    measurementExtractionRecall,
    componentAccuracy,
    caseResults,
    summary,
  };
}
