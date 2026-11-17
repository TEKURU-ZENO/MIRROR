// MIRROR — Local Conflict Detector
// Compares inspections for the same assetId and flags damageLevel discrepancies.

import type { ConflictFlag, DamageLevel } from '@mirror/core';
import { db } from './db.js';

export async function detectConflictsLocally(): Promise<ConflictFlag[]> {
  const inspections = await db.inspections.toArray();

  // Group inspections by assetId
  const byAsset = new Map<string, string[]>();
  for (const inspection of inspections) {
    const list = byAsset.get(inspection.assetId) ?? [];
    list.push(inspection.id);
    byAsset.set(inspection.assetId, list);
  }

  const conflicts: ConflictFlag[] = [];

  for (const [assetId, inspectionIds] of byAsset) {
    if (inspectionIds.length < 2) continue;

    // Load observation-summary intelligence records for each inspection
    const damageLevelsByInspection = new Map<string, DamageLevel[]>();

    for (const inspectionId of inspectionIds) {
      const records = await db.intelligence
        .where('inspectionId')
        .equals(inspectionId)
        .toArray();

      const damageLevels: DamageLevel[] = [];
      for (const r of records) {
        if (r.content.kind === 'observation-summary') {
          damageLevels.push(r.content.damageLevel);
        }
      }

      if (damageLevels.length > 0) {
        damageLevelsByInspection.set(inspectionId, damageLevels);
      }
    }

    // Compare all inspections that have damage level recordings
    const inspectionEntries = [...damageLevelsByInspection.entries()];
    if (inspectionEntries.length < 2) continue;

    // Collect unique damage levels across all inspections for this asset
    const allDamageLevels = new Set<DamageLevel>();
    for (const [, levels] of inspectionEntries) {
      for (const level of levels) {
        allDamageLevels.add(level);
      }
    }

    if (allDamageLevels.size > 1) {
      const descriptions = inspectionEntries
        .map(([id, levels]) => `Inspection ${id.slice(0, 8)}: ${levels.join(', ')}`)
        .join(' vs ');

      conflicts.push({
        kind: 'conflict-flag',
        conflictingInspectionIds: inspectionEntries.map(([id]) => id),
        description: `Discrepancy for asset ${assetId}: ${descriptions}`,
      });
    }
  }

  return conflicts;
}
