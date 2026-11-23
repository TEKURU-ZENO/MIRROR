import { describe, it, expect } from 'vitest';
import {
  analyzeDamageCascades,
  clusterSpatialDamage,
  type AssetDamageState,
} from './spatialGraph.js';
import type { InfrastructureAsset } from '@mirror/core';

describe('Spatial & Topological Damage Graph Engine', () => {
  const assetSub: InfrastructureAsset = {
    id: 'SUB-1',
    name: 'Substation West',
    assetType: 'substation',
    criticality: 5,
    location: { label: 'West Industrial Park', coordinates: { lat: 34.01, lng: -118.25 } },
    connectedAssetIds: ['FDR-10'],
  };

  const assetFeeder: InfrastructureAsset = {
    id: 'FDR-10',
    name: 'Hospital Express Feeder',
    assetType: 'feeder',
    criticality: 5,
    location: { label: 'West Main', coordinates: { lat: 34.012, lng: -118.251 } },
    connectedAssetIds: ['SUB-1', 'POLE-42'],
  };

  const assetPole: InfrastructureAsset = {
    id: 'POLE-42',
    name: 'Pole 42',
    assetType: 'pole',
    criticality: 2,
    location: { label: '4th St', coordinates: { lat: 34.013, lng: -118.252 } },
    connectedAssetIds: ['FDR-10'],
  };

  const assetDistant: InfrastructureAsset = {
    id: 'POLE-99',
    name: 'Distant Pole',
    assetType: 'pole',
    criticality: 1,
    location: { label: 'East Suburb', coordinates: { lat: 34.15, lng: -118.10 } }, // ~20km away
    connectedAssetIds: [],
  };

  const assetMap = new Map<string, InfrastructureAsset>([
    ['SUB-1', assetSub],
    ['FDR-10', assetFeeder],
    ['POLE-42', assetPole],
    ['POLE-99', assetDistant],
  ]);

  it('analyzeDamageCascades detects downstream isolated assets and critical infrastructure impacts', () => {
    const damageList: AssetDamageState[] = [
      {
        assetId: 'SUB-1',
        damageLevel: 'severe',
        riskScore: 95,
        defectTypes: ['transformer-explosion'],
      },
      {
        assetId: 'POLE-99',
        damageLevel: 'minor',
        riskScore: 10,
        defectTypes: ['minor-surface-scratch'],
      },
    ];

    const cascades = analyzeDamageCascades(damageList, assetMap);
    expect(cascades).toHaveLength(1);
    expect(cascades[0].sourceAssetId).toBe('SUB-1');
    expect(cascades[0].totalDownstreamAffected).toBe(2);
    expect(cascades[0].isolatedAssetIds).toContain('FDR-10');
    expect(cascades[0].isolatedAssetIds).toContain('POLE-42');
    expect(cascades[0].criticalAssetsImpacted).toContain('FDR-10');
  });

  it('clusterSpatialDamage groups proximate assets into clusters and separates distant assets', () => {
    const damageList: AssetDamageState[] = [
      {
        assetId: 'SUB-1',
        damageLevel: 'severe',
        riskScore: 90,
        defectTypes: ['leak'],
      },
      {
        assetId: 'FDR-10',
        damageLevel: 'moderate',
        riskScore: 50,
        defectTypes: ['sag'],
      },
      {
        assetId: 'POLE-99',
        damageLevel: 'severe',
        riskScore: 85,
        defectTypes: ['crack'],
      },
    ];

    const clusters = clusterSpatialDamage(damageList, assetMap, 1000); // 1km radius
    expect(clusters).toHaveLength(2);

    // Cluster 1 has SUB-1 and FDR-10 (~250m apart)
    const cluster1 = clusters.find((c) => c.assetIds.includes('SUB-1'));
    expect(cluster1).toBeDefined();
    expect(cluster1?.assetIds).toContain('FDR-10');
    expect(cluster1?.totalDamageScore).toBe(140); // 90 + 50

    // Cluster 2 has distant POLE-99 alone
    const cluster2 = clusters.find((c) => c.assetIds.includes('POLE-99'));
    expect(cluster2).toBeDefined();
    expect(cluster2?.assetIds).toHaveLength(1);
  });
});
