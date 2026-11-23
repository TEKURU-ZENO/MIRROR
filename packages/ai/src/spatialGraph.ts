// MIRROR — Spatial & Topological Damage Graph Engine
// Analyzes asset connectivity graphs, detects damage propagation/cascading risks,
// and clusters geographically correlated damage sites into operational repair corridors.

import type { DamageLevel, InfrastructureAsset, SpatialCoordinates } from '@mirror/core';
import { haversineDistanceMeters } from '@mirror/core';

export interface AssetDamageState {
  assetId: string;
  damageLevel: DamageLevel;
  riskScore: number; // 0 - 100
  defectTypes: string[];
}

export interface DamageCascadeImpact {
  sourceAssetId: string;
  sourceSeverity: DamageLevel;
  isolatedAssetIds: string[];
  totalDownstreamAffected: number;
  criticalAssetsImpacted: string[]; // Criticality >= 4
}

export interface SpatialDamageCluster {
  clusterId: string;
  centroid: SpatialCoordinates;
  assetIds: string[];
  totalDamageScore: number;
  corridorLabel: string;
}

/**
 * Identify downstream assets that will lose service or experience cascading overload
 * when a major asset suffers severe or catastrophic damage.
 */
export function analyzeDamageCascades(
  damagedAssets: AssetDamageState[],
  assetMap: Map<string, InfrastructureAsset>
): DamageCascadeImpact[] {
  const impacts: DamageCascadeImpact[] = [];

  for (const damage of damagedAssets) {
    if (damage.damageLevel !== 'severe' && damage.damageLevel !== 'destroyed') {
      continue;
    }

    const source = assetMap.get(damage.assetId);
    if (!source) continue;

    // Traverse downstream connected assets via BFS
    const visited = new Set<string>([source.id]);
    const queue = [...source.connectedAssetIds];
    const isolated: string[] = [];
    const criticalImpacted: string[] = [];

    while (queue.length > 0) {
      const neighborId = queue.shift()!;
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const neighbor = assetMap.get(neighborId);
      if (neighbor) {
        isolated.push(neighbor.id);
        if (neighbor.criticality >= 4) {
          criticalImpacted.push(neighbor.id);
        }
        for (const nextId of neighbor.connectedAssetIds) {
          if (!visited.has(nextId)) {
            queue.push(nextId);
          }
        }
      }
    }

    impacts.push({
      sourceAssetId: source.id,
      sourceSeverity: damage.damageLevel,
      isolatedAssetIds: isolated,
      totalDownstreamAffected: isolated.length,
      criticalAssetsImpacted: criticalImpacted,
    });
  }

  return impacts.sort((a, b) => b.totalDownstreamAffected - a.totalDownstreamAffected);
}

/**
 * Cluster geographically proximate damaged assets into operational response zones.
 * Uses spatial distance threshold (default: 800m).
 */
export function clusterSpatialDamage(
  damagedAssets: AssetDamageState[],
  assetMap: Map<string, InfrastructureAsset>,
  maxRadiusMeters = 800
): SpatialDamageCluster[] {
  const unclustered = new Set<string>(
    damagedAssets
      .filter((d) => d.damageLevel !== 'none' && assetMap.get(d.assetId)?.location.coordinates)
      .map((d) => d.assetId)
  );

  const damageScoreMap = new Map<string, number>(damagedAssets.map((d) => [d.assetId, d.riskScore]));
  const clusters: SpatialDamageCluster[] = [];
  let clusterIndex = 1;

  while (unclustered.size > 0) {
    const seedId = unclustered.values().next().value as string;
    unclustered.delete(seedId);

    const seedAsset = assetMap.get(seedId)!;
    const seedCoord = seedAsset.location.coordinates!;
    const clusterAssetIds = [seedId];

    // Find all unclustered assets within radius
    for (const otherId of Array.from(unclustered)) {
      const otherAsset = assetMap.get(otherId);
      if (otherAsset?.location.coordinates) {
        const dist = haversineDistanceMeters(seedCoord, otherAsset.location.coordinates);
        if (dist <= maxRadiusMeters) {
          clusterAssetIds.push(otherId);
          unclustered.delete(otherId);
        }
      }
    }

    // Compute centroid
    let sumLat = 0;
    let sumLng = 0;
    let totalScore = 0;

    for (const id of clusterAssetIds) {
      const asset = assetMap.get(id)!;
      sumLat += asset.location.coordinates!.lat;
      sumLng += asset.location.coordinates!.lng;
      totalScore += damageScoreMap.get(id) ?? 20;
    }

    clusters.push({
      clusterId: `CLUSTER-${clusterIndex++}`,
      centroid: {
        lat: Number((sumLat / clusterAssetIds.length).toFixed(6)),
        lng: Number((sumLng / clusterAssetIds.length).toFixed(6)),
      },
      assetIds: clusterAssetIds,
      totalDamageScore: totalScore,
      corridorLabel: `Damage Zone near ${seedAsset.location.label}`,
    });
  }

  return clusters.sort((a, b) => b.totalDamageScore - a.totalDamageScore);
}
