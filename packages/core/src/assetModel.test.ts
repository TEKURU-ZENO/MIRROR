import { describe, it, expect } from 'vitest';
import {
  haversineDistanceMeters,
  findNearbyAssets,
  findConnectedComponent,
  type InfrastructureAsset,
} from './assetModel.js';

describe('Infrastructure Asset & Spatial Model', () => {
  it('haversineDistanceMeters calculates accurate physical distance between coordinates', () => {
    // 1 degree latitude is approx 111,139 meters
    const c1 = { lat: 34.0522, lng: -118.2437 }; // Los Angeles
    const c2 = { lat: 34.0532, lng: -118.2437 }; // ~111m north

    const dist = haversineDistanceMeters(c1, c2);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(125);

    // Distance to self is 0
    expect(haversineDistanceMeters(c1, c1)).toBe(0);
  });

  it('findNearbyAssets returns assets within radius ordered by distance', () => {
    const center = { lat: 40.7128, lng: -74.006 };

    const assets: InfrastructureAsset[] = [
      {
        id: 'A1',
        name: 'Pole 1 (Nearby)',
        assetType: 'pole',
        criticality: 2,
        location: { label: 'Site 1', coordinates: { lat: 40.713, lng: -74.006 } }, // ~22m away
        connectedAssetIds: [],
      },
      {
        id: 'A2',
        name: 'Substation (Distant)',
        assetType: 'substation',
        criticality: 5,
        location: { label: 'Site 2', coordinates: { lat: 40.725, lng: -74.006 } }, // ~1.3km away
        connectedAssetIds: [],
      },
      {
        id: 'A3',
        name: 'Transformer (No GPS)',
        assetType: 'transformer',
        criticality: 3,
        location: { label: 'Site 3' },
        connectedAssetIds: [],
      },
    ];

    const nearby = findNearbyAssets(center, assets, 500); // 500m radius
    expect(nearby).toHaveLength(1);
    expect(nearby[0].asset.id).toBe('A1');
    expect(nearby[0].distanceMeters).toBeLessThan(100);
  });

  it('findConnectedComponent discovers all reachable topological nodes', () => {
    const assetA: InfrastructureAsset = {
      id: 'SUB-1',
      name: 'North Substation',
      assetType: 'substation',
      criticality: 5,
      location: { label: 'North' },
      connectedAssetIds: ['FDR-101'],
    };

    const assetB: InfrastructureAsset = {
      id: 'FDR-101',
      name: 'Feeder 101',
      assetType: 'feeder',
      criticality: 4,
      location: { label: 'Main St' },
      connectedAssetIds: ['SUB-1', 'POLE-42'],
    };

    const assetC: InfrastructureAsset = {
      id: 'POLE-42',
      name: 'Distribution Pole 42',
      assetType: 'pole',
      criticality: 3,
      location: { label: 'Oak Ave' },
      connectedAssetIds: ['FDR-101', 'TR-08'],
    };

    const assetD: InfrastructureAsset = {
      id: 'TR-08',
      name: 'Transformer 08',
      assetType: 'transformer',
      criticality: 3,
      location: { label: 'Oak Ave' },
      connectedAssetIds: ['POLE-42'],
    };

    const isolatedAsset: InfrastructureAsset = {
      id: 'POLE-999',
      name: 'Island Microgrid Pole',
      assetType: 'pole',
      criticality: 1,
      location: { label: 'Island' },
      connectedAssetIds: [],
    };

    const assetMap = new Map<string, InfrastructureAsset>([
      ['SUB-1', assetA],
      ['FDR-101', assetB],
      ['POLE-42', assetC],
      ['TR-08', assetD],
      ['POLE-999', isolatedAsset],
    ]);

    const component = findConnectedComponent('SUB-1', assetMap);
    expect(component).toHaveLength(4);
    const ids = component.map((a) => a.id);
    expect(ids).toContain('SUB-1');
    expect(ids).toContain('FDR-101');
    expect(ids).toContain('POLE-42');
    expect(ids).toContain('TR-08');
    expect(ids).not.toContain('POLE-999');
  });
});
