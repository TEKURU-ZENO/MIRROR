// MIRROR – Structured prompt templates for Gemini AI Logic cloud inference
// All prompts request JSON output matching core type schemas.

import type { InspectionRecord, EvidenceItem } from '@mirror/core';

export function buildSynthesisPrompt(
  inspections: InspectionRecord[],
  evidenceItems: EvidenceItem[]
): string {
  const inspectionSummaries = inspections.map((ins) => {
    const items = evidenceItems.filter((e) => e.inspectionId === ins.id);
    return {
      id: ins.id,
      assetId: ins.assetId,
      assetType: ins.assetType,
      locationLabel: ins.locationLabel,
      capturedAt: ins.capturedAt,
      evidenceCount: items.length,
      evidenceTypes: [...new Set(items.map((e) => e.type))],
      fieldNotes: items
        .filter((e) => e.fieldNotes)
        .map((e) => e.fieldNotes)
        .join(' | '),
    };
  });

  return `You are a field infrastructure incident assessment AI assistant.

Analyze the following ${inspections.length} inspections and produce a cross-inspection assessment.

INSPECTIONS:
${JSON.stringify(inspectionSummaries, null, 2)}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "kind": "cross-inspection-assessment",
  "incidentId": "<use the incidentId from the first inspection or 'unknown'>",
  "inspectionIds": ["<array of all inspection ids>"],
  "overallDamageLevel": "<one of: none | minor | moderate | severe | destroyed | unknown>",
  "summary": "<2-4 sentence overall assessment of the incident>",
  "priorityRanking": [
    {
      "inspectionId": "<id>",
      "priority": <integer 1=highest>,
      "rationale": "<why this inspection site has this priority>"
    }
  ],
  "conflictIds": []
}

Important: overallDamageLevel must be exactly one of: none, minor, moderate, severe, destroyed, unknown.
Return ONLY the JSON object with no markdown, no code fences, no explanation.`;
}

export function buildSummaryPrompt(
  inspection: InspectionRecord,
  evidenceItems: EvidenceItem[]
): string {
  const items = evidenceItems.filter((e) => e.inspectionId === inspection.id);
  const evidenceSummary = items.map((e) => ({
    type: e.type,
    filename: e.filename,
    fieldNotes: e.fieldNotes,
    capturedAt: e.capturedAt,
  }));

  return `You are a field infrastructure incident assessment AI assistant.

Summarize the following inspection of ${inspection.assetType} asset "${inspection.assetId}" at "${inspection.locationLabel}".

EVIDENCE ITEMS (${items.length} total):
${JSON.stringify(evidenceSummary, null, 2)}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "kind": "observation-summary",
  "text": "<2-3 sentence narrative summary of the inspection>",
  "damageLevel": "<one of: none | minor | moderate | severe | destroyed | unknown>",
  "keyFindings": ["<finding 1>", "<finding 2>", "..."],
  "caveats": ["<caveat about confidence or missing info>"]
}

Important: damageLevel must be exactly one of: none, minor, moderate, severe, destroyed, unknown.
Return ONLY the JSON object with no markdown, no code fences, no explanation.`;
}

export function buildConflictPrompt(inspections: InspectionRecord[]): string {
  const summaries = inspections.map((ins) => ({
    id: ins.id,
    assetId: ins.assetId,
    assetType: ins.assetType,
    locationLabel: ins.locationLabel,
    capturedAt: ins.capturedAt,
    evidenceCount: ins.evidence.length,
  }));

  return `You are a field infrastructure incident assessment AI assistant.

Review the following inspections and identify any conflicts or discrepancies between them.
Conflicts might include: different damage assessments for the same asset, contradictory observations, inconsistent location data, or duplicate entries.

INSPECTIONS:
${JSON.stringify(summaries, null, 2)}

Respond ONLY with a valid JSON array of conflict flags. Each flag must match this schema:
{
  "kind": "conflict-flag",
  "conflictingInspectionIds": ["<id1>", "<id2>"],
  "description": "<description of the conflict>",
  "resolution": null,
  "resolvedAt": null,
  "resolvedBy": null
}

If no conflicts are found, return an empty array: []
Return ONLY the JSON array with no markdown, no code fences, no explanation.`;
}

export function buildDamageAssessmentPrompt(input: {
  assetId: string;
  assetType: string;
  fieldNotes: string;
  assetCriticality?: number;
  locationLabel?: string;
  mediaDescription?: string;
}): string {
  return `You are a licensed senior infrastructure forensic engineer assessing critical utility and civil infrastructure damage following an incident.

ASSET UNDER ASSESSMENT:
- Asset ID: ${input.assetId}
- Asset Type: ${input.assetType}
- Location: ${input.locationLabel || 'Utility Right-of-Way'}
- Criticality Tier: ${input.assetCriticality ?? 3} / 5

FIELD OBSERVATIONS & EVIDENCE:
${input.fieldNotes}
${input.mediaDescription ? `Media Observations: ${input.mediaDescription}` : ''}

ENGINEERING TASK:
Analyze the field notes and sensor/visual evidence. Identify the defect, severity tier, affected component, and recommended immediate action.

TAXONOMY RESTRICTIONS:
- primaryDefect must be exactly one of: "structural-crack" | "leaning-tilt" | "conductor-down" | "oil-leak" | "thermal-hotspot" | "corrosion-rust" | "vegetation-encroachment" | "washout-erosion" | "insulator-damage"
- severity must be exactly one of: "minor" | "moderate" | "severe" | "critical"
  * critical: Imminent collapse, active energized conductor on ground, active dielectric oil fire risk, flashover puncture.
  * severe: Diagonal shear cracking (>3mm), severe thermal anomaly (Delta-T > 50°C), explosive gas near LEL, fatigue fracture in fracture-critical member.
  * moderate: Measurable section loss, groundline rot, scour/washout not yet undermining footing, thermal movement within limits.
  * minor: Superficial chipping (<5mm), hairline shrinkage crack (<0.3mm), cosmetic weathering without structural impact.
- actionRecommendation must be exactly one of: "IMMEDIATE_DE_ENERGIZE" | "DISPATCH_EMERGENCY_CREW" | "SCHEDULED_REPAIR" | "MONITOR"

Respond ONLY with a valid JSON object matching this exact schema:
{
  "primaryDefect": "<one of the allowed DefectType strings>",
  "secondaryDefects": ["<other observed DefectType strings>"],
  "severity": "<one of: minor | moderate | severe | critical>",
  "affectedComponent": "<identified structural or electrical component>",
  "actionRecommendation": "<one of the allowed action recommendations>",
  "quantitativeReadings": [
    {
      "label": "<measurement description e.g. crack width, temperature, tilt angle, rot depth>",
      "value": <numeric value>,
      "unit": "<unit string e.g. mm, °C, degrees, meters, %>"
    }
  ],
  "safetyHazard": <boolean, true if severe or critical risk to life/grid safety>,
  "confidence": <number between 0.0 and 1.0>,
  "rationale": "<2-3 sentence engineering justification explaining the diagnosis>"
}

Return ONLY the raw JSON object with no markdown fences, no backticks, and no conversational preamble.`;
}
