import { describe, it, expect } from 'vitest';
import {
  validateAndSanitizeAssetImport,
  createOrganizationProfile,
  generateSampleAssetFleet,
} from './customerOnboarding';

describe('Customer Onboarding & Asset Registry Engine', () => {
  it('creates default and customized customer organization profiles', () => {
    const defaultOrg = createOrganizationProfile({});
    expect(defaultOrg.name).toBe('Pacific Regional Power & Electric');
    expect(defaultOrg.industry).toBe('electric-utility');
    expect(defaultOrg.regulatoryStandards).toContain('NERC-CIP');

    const customOrg = createOrganizationProfile({
      name: 'Cascadia Bridge Authority',
      industry: 'civil-infrastructure',
      tier: 'enterprise',
      regulatoryStandards: ['DOT-FHWA', 'AASHTO'],
    });
    expect(customOrg.slug).toBe('cascadia-bridge-authority');
    expect(customOrg.regulatoryStandards).toEqual(['DOT-FHWA', 'AASHTO']);
  });

  it('validates and sanitizes valid asset manifests', () => {
    const fleet = generateSampleAssetFleet();
    const result = validateAndSanitizeAssetImport(fleet);

    expect(result.summary.total).toBe(5);
    expect(result.summary.valid).toBe(5);
    expect(result.summary.invalid).toBe(0);
    expect(result.summary.byCriticality['tier-1-critical']).toBe(3);
    expect(result.summary.byAssetType['substation']).toBe(1);
    expect(result.summary.byAssetType['bridge-pier']).toBe(1);
  });

  it('detects and isolates invalid asset records with clear errors', () => {
    const invalidBatch = [
      null,
      { assetId: 'AB' }, // too short, missing type, missing coords
      {
        assetId: 'SUB-INVALID-01',
        assetType: 'nuclear-reactor', // invalid type
        coordinates: { lat: 105.0, lng: -70.0 }, // lat > 90
      },
    ];

    const result = validateAndSanitizeAssetImport(invalidBatch);
    expect(result.summary.valid).toBe(0);
    expect(result.summary.invalid).toBe(3);
    expect(result.invalidAssets[0].errors[0]).toContain('object');
    expect(result.invalidAssets[1].errors.some((e) => e.includes('assetId'))).toBe(true);
    expect(result.invalidAssets[2].errors.some((e) => e.includes('assetType'))).toBe(true);
    expect(result.invalidAssets[2].errors.some((e) => e.includes('Latitude'))).toBe(true);
  });
});
