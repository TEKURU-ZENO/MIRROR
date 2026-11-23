// MIRROR — Infrastructure Incident Intelligence Benchmark & Evaluation Harness
// Evaluates AI and deterministic decision pipelines against standardized infrastructure disaster ground truth.
// Computes Grounding Precision, Conflict Recall, Triage Concordance, and Latency Profiles.

import type { InspectionRecord, InfrastructureAsset } from '@mirror/core';
import type { DamageObservation } from '@mirror/evidence';
import { extractEntitiesFromInspection } from './extraction.js';
import { validateEvidenceCitations } from './citationValidator.js';
import { prioritizeInspectionSites } from './prioritization.js';
import { detectConflicts } from './gemini.js';
import {
  evaluateDamageAssessmentSuite,
  type DamageAssessmentEvaluationReport,
} from './damageAssessmentEval.js';

export interface BenchmarkScenario {
  id: string;
  title: string;
  description: string;
  inspections: InspectionRecord[];
  observations: DamageObservation[];
  assetMap: Map<string, InfrastructureAsset>;
  groundTruth: {
    expectedConflictsCount: number;
    expectedTopPriorityAssetId: string;
    expectedMinIntegrityScore: number;
  };
}

export interface ScenarioEvaluation {
  scenarioId: string;
  title: string;
  passed: boolean;
  metrics: {
    groundingPrecision: number;     // 0.0 - 1.0
    conflictDetectionRecall: number;// 0.0 - 1.0
    triageConcordance: boolean;     // whether top priority matched ground truth
    citationIntegrityScore: number; // 0.0 - 1.0
    durationMs: number;
  };
  details: string;
}

export interface BenchmarkSuiteResult {
  executedAt: string;
  totalScenarios: number;
  passedScenarios: number;
  compositeScore: number; // 0 - 100
  scenarios: ScenarioEvaluation[];
  damageAssessmentReport: DamageAssessmentEvaluationReport;
  summary: string;
}

// ── Standardized Benchmark Dataset ─────────────────────────────────────────

export function getStandardBenchmarkScenarios(): BenchmarkScenario[] {
  const now = new Date().toISOString();

  // Scenario 1: Post-Storm Transmission Line Collapse (Downed Conductor over Highway)
  const s1AssetSub: InfrastructureAsset = {
    id: 'SUB-METRO',
    name: 'Metro Transmission Substation',
    assetType: 'substation',
    criticality: 5,
    location: { label: 'State Route 100 Highway Interchange' },
    connectedAssetIds: ['POLE-H1'],
  };
  const s1AssetPole: InfrastructureAsset = {
    id: 'POLE-H1',
    name: 'Distribution Pole H1',
    assetType: 'pole',
    criticality: 3,
    location: { label: 'State Route 100 Mile Marker 4' },
    connectedAssetIds: ['SUB-METRO'],
  };
  const s1Insp1: InspectionRecord = {
    id: 'insp-s1-1',
    incidentId: 'scen-1',
    inspectorId: 'ins-alpha',
    assetId: 'SUB-METRO',
    assetType: 'substation',
    locationLabel: 'State Route 100 Highway Interchange',
    capturedAt: now,
    ingestedAt: now,
    syncStatus: 'local-only',
    evidence: [
      {
        id: 'ev-s1-1',
        inspectionId: 'insp-s1-1',
        type: 'photo',
        storageRef: 'local://1',
        capturedAt: now,
        ingestedAt: now,
        checksum: 'c1'.repeat(32),
        fieldNotes: 'Substation bay flooded. Conductor severed and downed across Highway.',
      },
    ],
  };
  const s1Insp2: InspectionRecord = {
    id: 'insp-s1-2',
    incidentId: 'scen-1',
    inspectorId: 'ins-beta',
    assetId: 'POLE-H1',
    assetType: 'pole',
    locationLabel: 'State Route 100 Mile Marker 4',
    capturedAt: now,
    ingestedAt: now,
    syncStatus: 'local-only',
    evidence: [
      {
        id: 'ev-s1-2',
        inspectionId: 'insp-s1-2',
        type: 'photo',
        storageRef: 'local://2',
        capturedAt: now,
        ingestedAt: now,
        checksum: 'c2'.repeat(32),
        fieldNotes: 'Pole leaning 10 deg away from roadway.',
      },
    ],
  };

  const s1Obs: DamageObservation[] = [
    {
      id: 'obs-s1-1',
      evidenceId: 'ev-s1-1',
      inspectionId: 'insp-s1-1',
      assetId: 'SUB-METRO',
      defectType: 'conductor-down',
      component: 'feeder-bay',
      severity: 'critical',
    },
    {
      id: 'obs-s1-2',
      evidenceId: 'ev-s1-2',
      inspectionId: 'insp-s1-2',
      assetId: 'POLE-H1',
      defectType: 'leaning-tilt',
      component: 'pole-shaft',
      severity: 'moderate',
    },
  ];

  // Scenario 2: Substation Transformer Dielectric Leak with Sensor Discrepancy
  const s2AssetTR: InfrastructureAsset = {
    id: 'TR-100',
    name: 'Main Step-down Transformer',
    assetType: 'transformer',
    criticality: 4,
    location: { label: 'Industrial Yard Gate 2' },
    connectedAssetIds: [],
  };
  const s2Insp: InspectionRecord = {
    id: 'insp-s2-1',
    incidentId: 'scen-2',
    inspectorId: 'ins-gamma',
    assetId: 'TR-100',
    assetType: 'transformer',
    locationLabel: 'Industrial Yard Gate 2',
    capturedAt: now,
    ingestedAt: now,
    syncStatus: 'local-only',
    evidence: [
      {
        id: 'ev-s2-1',
        inspectionId: 'insp-s2-1',
        type: 'measurement',
        storageRef: 'local://3',
        capturedAt: now,
        ingestedAt: now,
        checksum: 'c3'.repeat(32),
        fieldNotes: 'Bushing oil leak observed on TR-100. Pressure dropped to 18 psi.',
      },
    ],
  };
  const s2Obs: DamageObservation[] = [
    {
      id: 'obs-s2-1',
      evidenceId: 'ev-s2-1',
      inspectionId: 'insp-s2-1',
      assetId: 'TR-100',
      defectType: 'oil-leak',
      component: 'tank-gasket',
      severity: 'severe',
    },
  ];

  return [
    {
      id: 'SCENARIO-1',
      title: 'High-Voltage Highway Conductor Severing',
      description: 'Post-derecho wind storm severed feeder conductor at substation, threatening highway traffic.',
      inspections: [s1Insp1, s1Insp2],
      observations: s1Obs,
      assetMap: new Map([
        ['SUB-METRO', s1AssetSub],
        ['POLE-H1', s1AssetPole],
      ]),
      groundTruth: {
        expectedConflictsCount: 0,
        expectedTopPriorityAssetId: 'SUB-METRO',
        expectedMinIntegrityScore: 1.0,
      },
    },
    {
      id: 'SCENARIO-2',
      title: 'Substation Transformer Oil Loss',
      description: 'Critical step-down transformer leaking dielectric coolant with pressure depletion.',
      inspections: [s2Insp],
      observations: s2Obs,
      assetMap: new Map([['TR-100', s2AssetTR]]),
      groundTruth: {
        expectedConflictsCount: 0,
        expectedTopPriorityAssetId: 'TR-100',
        expectedMinIntegrityScore: 1.0,
      },
    },
  ];
}

/**
 * Execute evaluation benchmark suite and calculate standardized performance indices.
 */
export async function runBenchmarkSuite(
  scenarios: BenchmarkScenario[] = getStandardBenchmarkScenarios()
): Promise<BenchmarkSuiteResult> {
  const evaluations: ScenarioEvaluation[] = [];

  for (const scenario of scenarios) {
    const start = performance.now();

    // 1. Evaluate Entity Extraction & Grounding
    let totalEntities = 0;
    let groundedEntities = 0;

    for (const insp of scenario.inspections) {
      const extracted = extractEntitiesFromInspection(insp, insp.evidence);
      totalEntities += extracted.entities.length + extracted.measurements.length;
      groundedEntities += extracted.totalGroundedEvidence;
    }

    const groundingPrecision = totalEntities > 0 ? Number((groundedEntities / totalEntities).toFixed(2)) : 1.0;

    // 2. Evaluate Citation Integrity
    const allEvidence = scenario.inspections.flatMap((i) => i.evidence);
    const citationReport = validateEvidenceCitations(
      allEvidence.map((e) => e.id),
      allEvidence
    );

    // 3. Evaluate Triage Ranking Concordance
    const triageResults = prioritizeInspectionSites(
      scenario.inspections,
      scenario.observations,
      scenario.assetMap
    );

    const topRankedAssetId = triageResults[0]?.assetId;
    const triageConcordance = topRankedAssetId === scenario.groundTruth.expectedTopPriorityAssetId;

    // 4. Evaluate Conflict Detection
    const conflicts = await detectConflicts(scenario.inspections);
    const conflictRecall =
      scenario.groundTruth.expectedConflictsCount === 0
        ? conflicts.length === 0 ? 1.0 : 0.5
        : conflicts.length >= scenario.groundTruth.expectedConflictsCount ? 1.0 : 0.0;

    const durationMs = Math.round(performance.now() - start);

    const passed =
      triageConcordance &&
      citationReport.integrityScore >= scenario.groundTruth.expectedMinIntegrityScore;

    evaluations.push({
      scenarioId: scenario.id,
      title: scenario.title,
      passed,
      metrics: {
        groundingPrecision,
        conflictDetectionRecall: conflictRecall,
        triageConcordance,
        citationIntegrityScore: citationReport.integrityScore,
        durationMs,
      },
      details: passed
        ? `Passed: Triage correctly prioritized ${topRankedAssetId}. Citation integrity: ${Math.round(citationReport.integrityScore * 100)}%.`
        : `Failed: Expected top priority ${scenario.groundTruth.expectedTopPriorityAssetId}, but got ${topRankedAssetId}.`,
    });
  }

  const passedCount = evaluations.filter((e) => e.passed).length;
  const compositeScore = Math.round((passedCount / evaluations.length) * 100);

  // Evaluate task-accuracy on ground-truth labeled incident dataset
  const damageAssessmentReport = evaluateDamageAssessmentSuite();

  return {
    executedAt: new Date().toISOString(),
    totalScenarios: evaluations.length,
    passedScenarios: passedCount,
    compositeScore,
    scenarios: evaluations,
    damageAssessmentReport,
    summary: `MIRROR Benchmark Suite completed: ${passedCount}/${evaluations.length} scenarios satisfied ground truth criteria (${compositeScore}% accuracy). Damage Assessment: Defect ${(damageAssessmentReport.defectClassificationAccuracy * 100).toFixed(0)}%, Severity ${(damageAssessmentReport.severityClassificationAccuracy * 100).toFixed(0)}%, Under-Triage ${(damageAssessmentReport.criticalUnderTriageRate * 100).toFixed(0)}%.`,
  };
}
