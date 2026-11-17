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
