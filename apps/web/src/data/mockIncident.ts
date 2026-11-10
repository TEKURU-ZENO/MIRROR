// Post-storm flagship demonstration dataset
// Hurricane / severe storm infrastructure damage scenario
// Assets: Poles, Distribution Transformers, Substation feeders

import type { Incident, InspectionRecord, EvidenceItem } from '@mirror/core';

export const MOCK_INCIDENT: Incident = {
  id: 'inc-storm-2026-09',
  title: 'Hurricane Helene — Grid Sector 4 Impact Assessment',
  description:
    'Severe storm damage across Key West transmission & distribution lines. High winds and storm surge reported.',
  occurredAt: '2026-09-28T04:15:00.000Z',
  affectedArea: 'Monroe County, FL — Grid Sector 4 & 5',
  status: 'under-assessment',
  createdAt: '2026-09-28T06:00:00.000Z',
  updatedAt: '2026-09-28T08:30:00.000Z',
};

export const MOCK_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'ev-001',
    inspectionId: 'insp-pole-402',
    type: 'photo',
    filename: 'pole_402_crossarm_shear.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2450120,
    storageRef: 'local://evidence/ev-001',
    capturedAt: '2026-09-28T07:15:00.000Z',
    ingestedAt: '2026-09-28T07:16:00.000Z',
    fieldNotes: 'Pole 402 crossarm sheared at secondary phase clamp. High tension on neutral span.',
    checksum: 'a4b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
  },
  {
    id: 'ev-002',
    inspectionId: 'insp-pole-402',
    type: 'note',
    filename: 'inspector_measurement.txt',
    mimeType: 'text/plain',
    sizeBytes: 312,
    storageRef: 'local://evidence/ev-002',
    capturedAt: '2026-09-28T07:18:00.000Z',
    ingestedAt: '2026-09-28T07:18:30.000Z',
    fieldNotes: 'Deflection angle: 18 degrees towards roadway. Ground heave visible at base.',
    checksum: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
  },
  {
    id: 'ev-003',
    inspectionId: 'insp-xfmr-88',
    type: 'photo',
    filename: 'substation_bay2_oil_leak.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3891400,
    storageRef: 'local://evidence/ev-003',
    capturedAt: '2026-09-28T07:45:00.000Z',
    ingestedAt: '2026-09-28T07:46:10.000Z',
    fieldNotes: 'Pad-mounted transformer unit #88 cooling fin puncture. Dielectric fluid pooling on gravel.',
    checksum: 'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
  },
  {
    id: 'ev-004',
    inspectionId: 'insp-pole-403',
    type: 'photo',
    filename: 'pole_403_intact_observation.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1980320,
    storageRef: 'local://evidence/ev-004',
    capturedAt: '2026-09-28T08:10:00.000Z',
    ingestedAt: '2026-09-28T08:11:00.000Z',
    fieldNotes: 'Adjacent Pole 403 structurally intact, but conductor de-tensioned due to Pole 402 failure.',
    checksum: 'd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
  },
];

export const MOCK_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'insp-pole-402',
    incidentId: 'inc-storm-2026-09',
    inspectorId: 'insp-user-sarah-chen',
    assetId: 'POLE-FL-402',
    assetType: 'pole',
    locationLabel: 'Mile Marker 88.5 Overseas Highway',
    coordinates: { lat: 24.9351, lng: -80.5982 },
    capturedAt: '2026-09-28T07:15:00.000Z',
    ingestedAt: '2026-09-28T07:16:00.000Z',
    syncStatus: 'local-only',
    evidence: [MOCK_EVIDENCE_ITEMS[0], MOCK_EVIDENCE_ITEMS[1]],
  },
  {
    id: 'insp-xfmr-88',
    incidentId: 'inc-storm-2026-09',
    inspectorId: 'insp-user-marcus-vance',
    assetId: 'XFMR-PAD-088',
    assetType: 'transformer',
    locationLabel: 'Substation 4 — Bay 2 Feeder',
    coordinates: { lat: 24.9412, lng: -80.5891 },
    capturedAt: '2026-09-28T07:45:00.000Z',
    ingestedAt: '2026-09-28T07:46:10.000Z',
    syncStatus: 'local-only',
    evidence: [MOCK_EVIDENCE_ITEMS[2]],
  },
  {
    id: 'insp-pole-403',
    incidentId: 'inc-storm-2026-09',
    inspectorId: 'insp-user-sarah-chen',
    assetId: 'POLE-FL-403',
    assetType: 'pole',
    locationLabel: 'Mile Marker 88.7 Overseas Highway',
    coordinates: { lat: 24.9378, lng: -80.5945 },
    capturedAt: '2026-09-28T08:10:00.000Z',
    ingestedAt: '2026-09-28T08:11:00.000Z',
    syncStatus: 'local-only',
    evidence: [MOCK_EVIDENCE_ITEMS[3]],
  },
];
