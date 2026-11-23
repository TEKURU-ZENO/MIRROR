// MIRROR — Infrastructure Asset & Spatial Hierarchy Model
// Defines physical asset taxonomy, geospatial positioning, electrical/civil connectivity,
// and hierarchical relationships (e.g. Substation -> Feeder -> Pole -> Transformer).

import type { AssetType, ISOTimestamp } from './types.js';

export interface SpatialCoordinates {
  lat: number;
  lng: number;
  elevationMeters?: number;
}

export interface AssetHierarchy {
  substationId?: string;
  feederId?: string;
  parentAssetId?: string; // e.g. transformer mounted on a pole
}

export interface InfrastructureAsset {
  id: string; // e.g. "SUB-NORTH-01", "POLE-42", "TR-08"
  name: string;
  assetType: AssetType;
  criticality: 1 | 2 | 3 | 4 | 5; // 5 = critical backbone hospital/grid feeder
  location: {
    label: string;
    coordinates?: SpatialCoordinates;
  };
  hierarchy?: AssetHierarchy;
  connectedAssetIds: string[]; // Topological grid connections (upstream and downstream)
  operatingVoltageKv?: number;
  installationYear?: number;
  lastInspectedAt?: ISOTimestamp;
}

/**
 * Compute the great-circle distance between two geographic coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistanceMeters(
  c1: SpatialCoordinates,
  c2: SpatialCoordinates
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(c2.lat - c1.lat);
  const dLng = toRad(c2.lng - c1.lng);
  const lat1 = toRad(c1.lat);
  const lat2 = toRad(c2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Filter an asset pool for assets situated within a spatial radius (in meters).
 */
export function findNearbyAssets(
  target: SpatialCoordinates,
  assetPool: InfrastructureAsset[],
  radiusMeters: number
): Array<{ asset: InfrastructureAsset; distanceMeters: number }> {
  const nearby: Array<{ asset: InfrastructureAsset; distanceMeters: number }> = [];

  for (const asset of assetPool) {
    if (!asset.location.coordinates) continue;
    const distance = haversineDistanceMeters(target, asset.location.coordinates);
    if (distance <= radiusMeters) {
      nearby.push({ asset, distanceMeters: distance });
    }
  }

  return nearby.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Traverse the topological connectivity graph from a root asset to identify the entire connected grid component.
 */
export function findConnectedComponent(
  startAssetId: string,
  assetMap: Map<string, InfrastructureAsset>
): InfrastructureAsset[] {
  const visited = new Set<string>();
  const queue: string[] = [startAssetId];
  const component: InfrastructureAsset[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const asset = assetMap.get(currentId);
    if (asset) {
      component.push(asset);
      for (const neighborId of asset.connectedAssetIds) {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }
  }

  return component;
}
