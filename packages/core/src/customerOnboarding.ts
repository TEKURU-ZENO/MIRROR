// MIRROR — Enterprise Asset Registry & Customer Onboarding Engine
// Provides multi-tenant utility profile modeling, schema validation,
// and bulk asset fleet ingestion with coordinate verification.

export type UtilityIndustry =
  | 'electric-utility'
  | 'civil-infrastructure'
  | 'telecom'
  | 'energy-generation';

export type EnterpriseTier = 'enterprise' | 'regional' | 'pilot';

export interface CustomerOrganization {
  id: string;
  name: string;
  slug: string;
  industry: UtilityIndustry;
  tier: EnterpriseTier;
  regulatoryStandards: string[]; // e.g., ['NERC-CIP', 'FERC', 'DOT-FHWA', 'OSHA']
  contactEmail: string;
  headquarters: string;
  createdAt: string;
}

export type OnboardedAssetType =
  | 'substation'
  | 'transmission-tower'
  | 'distribution-pole'
  | 'bridge-pier'
  | 'transformer';

export type CriticalityTier = 'tier-1-critical' | 'tier-2-essential' | 'tier-3-standard';

export interface AssetRegistryItem {
  assetId: string;
  name: string;
  assetType: OnboardedAssetType;
  criticality: CriticalityTier;
  coordinates: {
    lat: number;
    lng: number;
  };
  jurisdiction: string;
  voltageRatingKV?: number;
  yearCommissioned?: number;
  lastInspectionDate?: string;
}

export interface AssetImportError {
  item: unknown;
  errors: string[];
}

export interface AssetImportValidationResult {
  validAssets: AssetRegistryItem[];
  invalidAssets: AssetImportError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    byCriticality: Record<CriticalityTier, number>;
    byAssetType: Record<OnboardedAssetType, number>;
  };
}

const VALID_ASSET_TYPES: Set<string> = new Set([
  'substation',
  'transmission-tower',
  'distribution-pole',
  'bridge-pier',
  'transformer',
]);

const VALID_CRITICALITY: Set<string> = new Set([
  'tier-1-critical',
  'tier-2-essential',
  'tier-3-standard',
]);

/**
 * Validates, normalizes, and sanitizes an array of raw asset objects for registry onboarding.
 */
export function validateAndSanitizeAssetImport(records: unknown[]): AssetImportValidationResult {
  const validAssets: AssetRegistryItem[] = [];
  const invalidAssets: AssetImportError[] = [];

  const byCriticality: Record<CriticalityTier, number> = {
    'tier-1-critical': 0,
    'tier-2-essential': 0,
    'tier-3-standard': 0,
  };

  const byAssetType: Record<OnboardedAssetType, number> = {
    substation: 0,
    'transmission-tower': 0,
    'distribution-pole': 0,
    'bridge-pier': 0,
    transformer: 0,
  };

  for (const raw of records) {
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object') {
      invalidAssets.push({ item: raw, errors: ['Item must be a valid non-null object'] });
      continue;
    }

    const rec = raw as Record<string, unknown>;

    // 1. Asset ID
    const assetId = typeof rec.assetId === 'string' ? rec.assetId.trim().toUpperCase() : '';
    if (!assetId || assetId.length < 3) {
      errors.push('assetId is required and must be at least 3 characters');
    }

    // 2. Name
    const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : (assetId || 'Unnamed Asset');

    // 3. Asset Type
    const assetType = typeof rec.assetType === 'string' ? rec.assetType.toLowerCase() : '';
    if (!VALID_ASSET_TYPES.has(assetType)) {
      errors.push(`Invalid assetType "${rec.assetType}". Allowed: ${Array.from(VALID_ASSET_TYPES).join(', ')}`);
    }

    // 4. Criticality
    const criticality = typeof rec.criticality === 'string' ? rec.criticality.toLowerCase() : 'tier-3-standard';
    if (!VALID_CRITICALITY.has(criticality)) {
      errors.push(`Invalid criticality "${rec.criticality}". Allowed: ${Array.from(VALID_CRITICALITY).join(', ')}`);
    }

    // 5. Coordinates (Latitude & Longitude)
    const coords = rec.coordinates as Record<string, unknown> | undefined;
    const lat = typeof coords?.lat === 'number' ? coords.lat : Number(coords?.lat);
    const lng = typeof coords?.lng === 'number' ? coords.lng : Number(coords?.lng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Latitude must be a valid number between -90 and 90');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Longitude must be a valid number between -180 and 180');
    }

    // 6. Jurisdiction
    const jurisdiction = typeof rec.jurisdiction === 'string' && rec.jurisdiction.trim()
      ? rec.jurisdiction.trim()
      : 'Default District';

    if (errors.length > 0) {
      invalidAssets.push({ item: raw, errors });
    } else {
      const sanitized: AssetRegistryItem = {
        assetId,
        name,
        assetType: assetType as OnboardedAssetType,
        criticality: criticality as CriticalityTier,
        coordinates: { lat, lng },
        jurisdiction,
        voltageRatingKV: typeof rec.voltageRatingKV === 'number' ? rec.voltageRatingKV : undefined,
        yearCommissioned: typeof rec.yearCommissioned === 'number' ? rec.yearCommissioned : undefined,
        lastInspectionDate: typeof rec.lastInspectionDate === 'string' ? rec.lastInspectionDate : undefined,
      };

      validAssets.push(sanitized);
      byCriticality[sanitized.criticality]++;
      byAssetType[sanitized.assetType]++;
    }
  }

  return {
    validAssets,
    invalidAssets,
    summary: {
      total: records.length,
      valid: validAssets.length,
      invalid: invalidAssets.length,
      byCriticality,
      byAssetType,
    },
  };
}

/**
 * Creates a fully initialized enterprise customer organization profile.
 */
export function createOrganizationProfile(profile: Partial<CustomerOrganization>): CustomerOrganization {
  const name = profile.name || 'Pacific Regional Power & Electric';
  const slug = profile.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return {
    id: profile.id || `org-${crypto.randomUUID().slice(0, 8)}`,
    name,
    slug,
    industry: profile.industry || 'electric-utility',
    tier: profile.tier || 'enterprise',
    regulatoryStandards: profile.regulatoryStandards || ['NERC-CIP', 'FERC', 'OSHA-1910'],
    contactEmail: profile.contactEmail || 'ops@gridcorp.example.com',
    headquarters: profile.headquarters || 'Portland, Oregon',
    createdAt: profile.createdAt || new Date().toISOString(),
  };
}

/**
 * Generates a realistic sample fleet for quick-start enterprise demonstration.
 */
export function generateSampleAssetFleet(): AssetRegistryItem[] {
  return [
    {
      assetId: 'SUB-CASCADE-01',
      name: 'Cascade Main Substation 500kV',
      assetType: 'substation',
      criticality: 'tier-1-critical',
      coordinates: { lat: 45.5152, lng: -122.6784 },
      jurisdiction: 'Cascade Region Grid Dist 1',
      voltageRatingKV: 500,
      yearCommissioned: 2008,
      lastInspectionDate: '2026-10-15',
    },
    {
      assetId: 'TX-CORRIDOR-042',
      name: 'North River Transmission Crossing Pylon',
      assetType: 'transmission-tower',
      criticality: 'tier-1-critical',
      coordinates: { lat: 45.5225, lng: -122.6842 },
      jurisdiction: 'Cascade Region Grid Dist 1',
      voltageRatingKV: 230,
      yearCommissioned: 2012,
      lastInspectionDate: '2026-09-20',
    },
    {
      assetId: 'XFMR-T101',
      name: 'Substation Step-Down Transformer T101',
      assetType: 'transformer',
      criticality: 'tier-1-critical',
      coordinates: { lat: 45.5155, lng: -122.6781 },
      jurisdiction: 'Cascade Region Grid Dist 1',
      voltageRatingKV: 115,
      yearCommissioned: 2016,
      lastInspectionDate: '2026-11-01',
    },
    {
      assetId: 'BRG-WILLAMETTE-PIER3',
      name: 'Willamette Rail & Utility Bridge Pier 3',
      assetType: 'bridge-pier',
      criticality: 'tier-2-essential',
      coordinates: { lat: 45.5189, lng: -122.6721 },
      jurisdiction: 'Municipal Transit & Utilities',
      yearCommissioned: 1984,
      lastInspectionDate: '2026-08-14',
    },
    {
      assetId: 'DIST-POLE-8821',
      name: 'Cedar Hills Feeder Lateral Pole 8821',
      assetType: 'distribution-pole',
      criticality: 'tier-3-standard',
      coordinates: { lat: 45.5098, lng: -122.6911 },
      jurisdiction: 'West Metro Distribution',
      voltageRatingKV: 13.8,
      yearCommissioned: 2019,
      lastInspectionDate: '2026-07-22',
    },
  ];
}
