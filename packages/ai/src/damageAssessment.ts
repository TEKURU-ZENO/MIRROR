// MIRROR — Infrastructure Damage Assessment Engine
// Evaluates field observations, defect types, severity tiers, affected components,
// and action recommendations against engineering ground-truth standards.

import type { DefectType, DefectSeverity } from '@mirror/evidence';
import type { TriageActionRecommendation } from './prioritization.js';

export interface DamageAssessmentInput {
  assetId: string;
  assetType: string;
  fieldNotes: string;
  assetCriticality?: number; // 1-5
  locationLabel?: string;
  mediaDescription?: string;
}

export interface QuantitativeReading {
  label: string;
  value: number;
  unit: string;
}

export interface AssessedDamageResult {
  primaryDefect: DefectType;
  secondaryDefects: DefectType[];
  severity: DefectSeverity;
  affectedComponent: string;
  actionRecommendation: TriageActionRecommendation;
  quantitativeReadings: QuantitativeReading[];
  confidence: number;
  safetyHazard: boolean;
  rationale: string;
}

interface DefectRule {
  defectType: DefectType;
  patterns: RegExp[];
  weight: number;
}

const DEFECT_RULES: DefectRule[] = [
  {
    defectType: 'conductor-down',
    patterns: [
      /\b(?:conductor|cable|wire|line)\s+(?:down|severed|snapped|lying|fallen)\b/i,
      /\b(?:downed|fallen|severed)\s+(?:conductor|cable|wire|line)\b/i,
      /\bsparking\s+(?:on|across|near)\b/i,
    ],
    weight: 10,
  },
  {
    defectType: 'oil-leak',
    patterns: [
      /\b(?:dielectric\s+)?oil\s+(?:leak|leaking|pooling|spill|seep|seepage)\b/i,
      /\b(?:leaking|pooling)\s+(?:dielectric\s+)?oil\b/i,
      /\boil\s+level\s+drop\b/i,
    ],
    weight: 9,
  },
  {
    defectType: 'thermal-hotspot',
    patterns: [
      /\b(?:thermal|infrared|ir)\s+(?:hotspot|hot\s+spot|scan|thermography)\b/i,
      /\b(?:running\s+at|temperature\s+of|temp\s+of)\s+\d+(?:\.\d+)?\s*(?:°c|c|deg\s*c)\b/i,
      /\bdelta-?t\b/i,
      /\b(?:arcing|sparking|flashover|scorch|burnt|fan\s+seized|exhaust\s+fan)\b/i,
    ],
    weight: 8,
  },
  {
    defectType: 'leaning-tilt',
    patterns: [
      /\b(?:lean|leaning|tilt|tilted|buckl(?:ed|ing)|out\s+of\s+plumb)\b/i,
      /\b(?:shear\s+deformation|bearing\s+pad\s+displacement)\b/i,
      /\bslope\s+subsidence\b/i,
    ],
    weight: 8,
  },
  {
    defectType: 'structural-crack',
    patterns: [
      /\b(?:shear\s+crack|diagonal\s+crack|hairline\s+crack|crack(?:ed|ing)?|fracture|spall(?:ed|ing)?)\b/i,
      /\bconcrete\s+(?:core|cover|spalled|cracking)\b/i,
    ],
    weight: 7,
  },
  {
    defectType: 'insulator-damage',
    patterns: [
      /\b(?:insulator|porcelain|glaze\s+chip(?:ping)?|shed\s+skirt|bell\s+insulator)\b/i,
      /\bflashover\s+puncture\b/i,
    ],
    weight: 7,
  },
  {
    defectType: 'vegetation-encroachment',
    patterns: [
      /\b(?:tree\s+(?:limb|branch|contact)|vegetation|overgrown|encroach(?:ment)?)\b/i,
    ],
    weight: 6,
  },
  {
    defectType: 'washout-erosion',
    patterns: [
      /\b(?:washout|erosion|gully|embankment\s+wash|undermined|drainage\s+ditch)\b/i,
    ],
    weight: 6,
  },
  {
    defectType: 'corrosion-rust',
    patterns: [
      /\b(?:corro(?:ded|sion)|rust(?:ed|ing)?|oxidation|exposed\s+rebar|fungal\s+rot)\b/i,
    ],
    weight: 5,
  },
];

const COMPONENT_PATTERNS: Array<{ pattern: RegExp; component: string }> = [
  { pattern: /\b(?:230kv\s+)?bushing\b/i, component: 'bushing' },
  { pattern: /\btransformer\s+tank\b/i, component: 'transformer-tank' },
  { pattern: /\b(?:tower\s+)?leg(?:\s+member)?(?:\s+[a-z0-9]+)?\b/i, component: 'tower-leg' },
  { pattern: /\b(?:cross-?bracing|gusset\s+plate)\b/i, component: 'bracing' },
  { pattern: /\bpier\s+\d+(?:\s+column)?\b/i, component: 'pier-column' },
  { pattern: /\bpedestal\b/i, component: 'pedestal' },
  { pattern: /\bbearing\s+pad\b/i, component: 'bearing-pad' },
  { pattern: /\b(?:primary\s+)?conductor(?:\s+span)?\b/i, component: 'conductor-span' },
  { pattern: /\bdisconnect\s+switch\b/i, component: 'disconnect-switch' },
  { pattern: /\b(?:pole\s+base|wood\s+pole|groundline)\b/i, component: 'pole-base' },
  { pattern: /\bguy\s+wire\b/i, component: 'guy-wire' },
  { pattern: /\b(?:drainage|embankment|ditch)\b/i, component: 'drainage-embankment' },
  { pattern: /\b(?:insulator\s+string|bell\s+insulator)\b/i, component: 'insulator-string' },
  { pattern: /\b(?:auxiliary\s+)?exhaust\s+fan\b/i, component: 'ventilation-fan' },
  { pattern: /\b(?:battery\s+bank|station\s+battery)\b/i, component: 'battery-bank' },
];

const MEASUREMENT_PATTERN = /(\d+(?:\.\d+)?)\s*(liters?\/minute|liters?\/min|l\/min|degrees?|deg|°c|°|mm|cm|meters?|m|%|pct|kv|v)(?!\w)/gi;

/**
 * Extracts quantitative measurements with units from field text.
 */
export function extractQuantitativeReadings(text: string): QuantitativeReading[] {
  const readings: QuantitativeReading[] = [];
  let match: RegExpExecArray | null;
  MEASUREMENT_PATTERN.lastIndex = 0;

  while ((match = MEASUREMENT_PATTERN.exec(text)) !== null) {
    const rawVal = parseFloat(match[1]);
    const rawUnit = match[2].toLowerCase();

    // Context label snippet
    const startIdx = Math.max(0, match.index - 25);
    const snippet = text.slice(startIdx, match.index).trim();
    let label = 'measurement';

    if (/leak(?:\s+rate)?/i.test(snippet)) label = 'leak rate';
    else if (/tilt|lean|angle/i.test(snippet)) label = 'tilt angle';
    else if (/crack(?:\s+width)?/i.test(snippet)) label = 'crack width';
    else if (/temp(?:erature)?|delta-?t|running\s+at/i.test(snippet)) label = 'temperature';
    else if (/rot|depth/i.test(snippet)) label = 'rot depth';
    else if (/erosion|gully/i.test(snippet)) label = 'erosion depth';
    else if (/shear|deformation|displacement/i.test(snippet)) label = 'shear deformation';
    else if (/hydrogen|concentration|lel/i.test(snippet)) label = 'gas concentration';
    else if (/chip(?:ping)?|diameter/i.test(snippet)) label = 'defect size';

    // Normalize unit
    let unit = rawUnit;
    if (unit.startsWith('deg') && !unit.includes('c')) unit = 'degrees';
    if (unit === '°') unit = 'degrees';
    if (unit.includes('c') || unit === '°c') unit = '°C';
    if (unit === 'meter' || unit === 'meters') unit = 'm';
    if (unit === 'pct') unit = '%';
    if (unit === 'l/min' || unit === 'liters/min') unit = 'liters/minute';

    readings.push({ label, value: rawVal, unit });
  }

  return readings;
}

/**
 * Evaluates infrastructure damage from field notes and multimodal observations.
 */
export function assessDamageFromNotes(input: DamageAssessmentInput): AssessedDamageResult {
  const fullText = `${input.fieldNotes} ${input.mediaDescription ?? ''} ${input.locationLabel ?? ''}`;

  // 1. Defect Matching
  const scoredDefects: Array<{ defect: DefectType; score: number }> = [];

  for (const rule of DEFECT_RULES) {
    let matches = 0;
    for (const pat of rule.patterns) {
      if (pat.test(fullText)) {
        matches++;
      }
    }
    if (matches > 0) {
      scoredDefects.push({
        defect: rule.defectType,
        score: rule.weight * matches,
      });
    }
  }

  scoredDefects.sort((a, b) => b.score - a.score);

  const primaryDefect: DefectType = scoredDefects.length > 0
    ? scoredDefects[0].defect
    : 'structural-crack';

  const secondaryDefects: DefectType[] = scoredDefects.slice(1).map((s) => s.defect);

  // 2. Component Identification
  let affectedComponent = input.assetType.toLowerCase();
  for (const comp of COMPONENT_PATTERNS) {
    if (comp.pattern.test(fullText)) {
      affectedComponent = comp.component;
      break;
    }
  }

  // 3. Quantitative Measurements
  const quantitativeReadings = extractQuantitativeReadings(fullText);

  // 4. Severity Assessment
  let severity: DefectSeverity = 'moderate';
  let isCriticalSafetyHazard = false;

  // Criteria for CRITICAL:
  // - Downed conductor in public/energized state
  // - Active dielectric oil leak pooling
  // - Tilt/buckling >= 10 degrees or imminent collapse
  // - Bushing porcelain shattered with flashover
  const hasConductorDown = primaryDefect === 'conductor-down' || secondaryDefects.includes('conductor-down');
  const hasOilLeak = primaryDefect === 'oil-leak' || secondaryDefects.includes('oil-leak');
  const hasHeavyTilt = (primaryDefect === 'leaning-tilt' || secondaryDefects.includes('leaning-tilt')) &&
    quantitativeReadings.some((r) => r.unit === 'degrees' && r.value >= 10);
  const isImminentCollapse = /imminent\s+risk\s+of\s+collapse|severely\s+buckled/i.test(fullText);
  const hasShatteredBushing = /bushing\s+porcelain\s+shattered/i.test(fullText);

  if (hasConductorDown || hasOilLeak || hasHeavyTilt || isImminentCollapse || hasShatteredBushing) {
    severity = 'critical';
    isCriticalSafetyHazard = true;
  }
  // Criteria for SEVERE:
  // - Diagonal shear crack with rebar exposure or crack width >= 3mm
  // - Thermal hotspot running >= 100°C or delta-T >= 50°C
  // - Hydrogen concentration near LEL (>= 1.5%)
  else {
    const hasShearCrack = /shear\s+crack/i.test(fullText) ||
      quantitativeReadings.some((r) => r.unit === 'mm' && r.value >= 3.0 && /crack/i.test(r.label));
    const hasHighTemp = quantitativeReadings.some(
      (r) => r.unit === '°C' && (r.value >= 100 || (r.value >= 50 && /delta/i.test(r.label)))
    );
    const hasHydrogenRisk = /hydrogen/i.test(fullText) &&
      quantitativeReadings.some((r) => r.unit === '%' && r.value >= 1.5);

    if (hasShearCrack || hasHighTemp || hasHydrogenRisk) {
      severity = 'severe';
    }
    // Criteria for MINOR:
    // - Superficial chipping (< 5mm), hairline crack (< 0.5mm), glaze chipping, dust/salt accumulation without discharge
    else {
      const isSuperficial = /minor\s+glaze\s+chipping|minor\s+hairline|superficial/i.test(fullText);
      const isTinyCrack = quantitativeReadings.some((r) => r.unit === 'mm' && r.value < 0.5 && /crack/i.test(r.label));
      const noTracking = /no\s+(?:electrical\s+)?tracking|no\s+flashover/i.test(fullText);

      if ((isSuperficial || isTinyCrack) && noTracking) {
        severity = 'minor';
      } else {
        severity = 'moderate';
      }
    }
  }

  // 5. Action Recommendation
  let actionRecommendation: TriageActionRecommendation;
  if (severity === 'critical') {
    actionRecommendation = 'IMMEDIATE_DE_ENERGIZE';
  } else if (severity === 'severe') {
    actionRecommendation = 'DISPATCH_EMERGENCY_CREW';
  } else if (severity === 'moderate') {
    actionRecommendation = 'SCHEDULED_REPAIR';
  } else {
    actionRecommendation = 'MONITOR';
  }

  // 6. Rationale & Confidence
  const rationale = `Identified ${primaryDefect} on ${affectedComponent}. Severity assessed as ${severity.toUpperCase()} ` +
    `based on field measurements (${quantitativeReadings.map((q) => `${q.value}${q.unit}`).join(', ') || 'qualitative notes'}). ` +
    `Recommended action: ${actionRecommendation}.`;

  const confidence = scoredDefects.length > 0 ? Math.min(0.99, 0.85 + scoredDefects[0].score * 0.01) : 0.80;

  return {
    primaryDefect,
    secondaryDefects,
    severity,
    affectedComponent,
    actionRecommendation,
    quantitativeReadings,
    confidence,
    safetyHazard: isCriticalSafetyHazard,
    rationale,
  };
}
