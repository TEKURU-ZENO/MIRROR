// MIRROR — Structured Evidence Entity Extraction & Grounding
// Extracts domain-specific infrastructure entities (assets, damage defects, measurements)
// and strictly binds each entity to its underlying EvidenceItem with verbatim context snippets.

import type { EvidenceItem, ExtractedEntity, InspectionRecord, UUID } from '@mirror/core';
import { generateId } from '@mirror/core';

export interface GroundedEntity extends ExtractedEntity {
  id: UUID;
  category: 'defect' | 'asset-id' | 'measurement' | 'operational-hazard' | 'component';
  confidence: number;
}

export interface ExtractedMeasurement {
  label: string;
  value: number;
  unit: string;
  sourceEvidenceId: UUID;
  contextSnippet: string;
}

// Regex patterns for infrastructure field observations
const ASSET_TAG_REGEX = /\b(?:POLE|TR|XFMR|FEEDER|SUB|BAY|LINE|SPAN|TOWER)-[A-Z0-9-]+\b/gi;
const MEASUREMENT_REGEX = /(\d+(?:\.\d+)?)\s*(degrees?|deg|°|m|meters?|ft|feet|cm|mm|psi|bar|kv|v|volts?|amps?|a|%|pct|hz)\b/gi;
const DEFECT_PATTERNS = [
  { pattern: /\b(crack(?:ed|ing)?|fracture(?:d)?)\b/i, category: 'defect' },
  { pattern: /\b(lean(?:ing)?|tilt(?:ed)?)\b/i, category: 'defect' },
  { pattern: /\b(leak(?:ing|age)?|spill)\b/i, category: 'defect' },
  { pattern: /\b(severed|snapped|downed|fallen)\b/i, category: 'defect' },
  { pattern: /\b(corro(?:ded|sion)|rust(?:ed)?)\b/i, category: 'defect' },
  { pattern: /\b(burn(?:t|ed)?|flashover|scorch(?:ed)?)\b/i, category: 'defect' },
  { pattern: /\b(sag(?:ging)?|slack)\b/i, category: 'defect' },
  { pattern: /\b(encroach(?:ment)?|vegetation|tree\s+contact)\b/i, category: 'operational-hazard' },
  { pattern: /\b(arcing|sparking|hotspot)\b/i, category: 'operational-hazard' },
];

/**
 * Extract a verbatim context window around a matched substring.
 */
function extractSnippet(text: string, matchIndex: number, matchLength: number, window = 40): string {
  const start = Math.max(0, matchIndex - window);
  const end = Math.min(text.length, matchIndex + matchLength + window);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Extract grounded entities from a single field evidence item.
 * Guarantee: Every entity is strictly linked to sourceEvidenceId.
 */
export function extractEntitiesFromEvidenceItem(item: EvidenceItem): GroundedEntity[] {
  const text = item.fieldNotes;
  if (!text || text.trim().length === 0) return [];

  const entities: GroundedEntity[] = [];
  const seenValues = new Set<string>();

  // 1. Asset Tag extraction
  let assetMatch: RegExpExecArray | null;
  ASSET_TAG_REGEX.lastIndex = 0;
  while ((assetMatch = ASSET_TAG_REGEX.exec(text)) !== null) {
    const val = assetMatch[0].toUpperCase();
    if (!seenValues.has(val)) {
      seenValues.add(val);
      entities.push({
        id: generateId(),
        kind: 'extracted-entity',
        entityType: 'asset',
        category: 'asset-id',
        value: val,
        sourceEvidenceId: item.id,
        contextSnippet: extractSnippet(text, assetMatch.index, assetMatch[0].length),
        confidence: 0.98,
      });
    }
  }

  // 2. Defect & Hazard extraction
  for (const { pattern, category } of DEFECT_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const val = match[0].toLowerCase();
      const key = `${category}:${val}`;
      if (!seenValues.has(key)) {
        seenValues.add(key);
        entities.push({
          id: generateId(),
          kind: 'extracted-entity',
          entityType: 'event',
          category: category as 'defect' | 'operational-hazard',
          value: val,
          sourceEvidenceId: item.id,
          contextSnippet: extractSnippet(text, match.index, match[0].length),
          confidence: 0.92,
        });
      }
    }
  }

  // 3. Measurement extraction
  let measMatch: RegExpExecArray | null;
  MEASUREMENT_REGEX.lastIndex = 0;
  while ((measMatch = MEASUREMENT_REGEX.exec(text)) !== null) {
    const val = measMatch[0];
    if (!seenValues.has(val)) {
      seenValues.add(val);
      entities.push({
        id: generateId(),
        kind: 'extracted-entity',
        entityType: 'measurement',
        category: 'measurement',
        value: val,
        sourceEvidenceId: item.id,
        contextSnippet: extractSnippet(text, measMatch.index, measMatch[0].length),
        confidence: 0.95,
      });
    }
  }

  return entities;
}

/**
 * Parse numeric measurements from an evidence item for quantitative engineering analysis.
 */
export function extractMeasurementsFromEvidence(item: EvidenceItem): ExtractedMeasurement[] {
  const text = item.fieldNotes;
  if (!text) return [];

  const measurements: ExtractedMeasurement[] = [];
  MEASUREMENT_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MEASUREMENT_REGEX.exec(text)) !== null) {
    const num = parseFloat(match[1]);
    const rawUnit = match[2].toLowerCase();
    const unit = normalizeUnit(rawUnit);
    const label = inferMeasurementLabel(rawUnit, text, match.index);

    measurements.push({
      label,
      value: num,
      unit,
      sourceEvidenceId: item.id,
      contextSnippet: extractSnippet(text, match.index, match[0].length),
    });
  }

  return measurements;
}

function normalizeUnit(unit: string): string {
  if (['degree', 'degrees', 'deg', '°'].includes(unit)) return 'deg';
  if (['meter', 'meters', 'm'].includes(unit)) return 'm';
  if (['feet', 'ft'].includes(unit)) return 'ft';
  if (['volts', 'volt', 'v'].includes(unit)) return 'V';
  if (['kv'].includes(unit)) return 'kV';
  if (['amps', 'amp', 'a'].includes(unit)) return 'A';
  if (['psi'].includes(unit)) return 'psi';
  if (['%', 'pct'].includes(unit)) return '%';
  return unit;
}

function inferMeasurementLabel(unit: string, text: string, index: number): string {
  const lowerSnippet = text.slice(Math.max(0, index - 30), index).toLowerCase();
  if (lowerSnippet.includes('lean') || lowerSnippet.includes('tilt') || unit.includes('deg')) return 'Lean Angle';
  if (lowerSnippet.includes('pressure') || unit === 'psi') return 'Oil Pressure';
  if (lowerSnippet.includes('sag') || lowerSnippet.includes('clearance')) return 'Span Clearance';
  if (lowerSnippet.includes('voltage') || unit === 'kv' || unit === 'v') return 'Operating Voltage';
  return 'Observed Measurement';
}

/**
 * Extract all grounded entities and quantitative measurements across an entire inspection.
 */
export function extractEntitiesFromInspection(
  inspection: InspectionRecord,
  evidenceItems: EvidenceItem[]
): {
  entities: GroundedEntity[];
  measurements: ExtractedMeasurement[];
  totalGroundedEvidence: number;
} {
  const relevantItems = evidenceItems.filter((e) => e.inspectionId === inspection.id);
  const entities: GroundedEntity[] = [];
  const measurements: ExtractedMeasurement[] = [];
  const evidenceIdsWithFindings = new Set<string>();

  for (const item of relevantItems) {
    const itemEntities = extractEntitiesFromEvidenceItem(item);
    const itemMeasurements = extractMeasurementsFromEvidence(item);

    if (itemEntities.length > 0 || itemMeasurements.length > 0) {
      evidenceIdsWithFindings.add(item.id);
    }

    entities.push(...itemEntities);
    measurements.push(...itemMeasurements);
  }

  return {
    entities,
    measurements,
    totalGroundedEvidence: evidenceIdsWithFindings.size,
  };
}
