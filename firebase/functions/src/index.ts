/**
 * MIRROR Cloud Functions
 *
 * Thin entry point. Functions are co-located with their domain.
 * Intelligence synthesis and cross-inspection correlation run here —
 * never client-side for multi-inspection operations.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const db = admin.firestore();

// ── Trigger: Inspection synced → enqueue cloud synthesis ─────
export const onInspectionSynced = onDocumentCreated(
  'inspections/{inspectionId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const inspection = snap.data();
    logger.info('[MIRROR] New inspection synced', {
      inspectionId: event.params.inspectionId,
      assetId: inspection?.assetId,
      syncStatus: inspection?.syncStatus,
    });

    // TODO: Enqueue cloud AI synthesis job
    // This will be implemented after the Day 1 spike confirms Firebase AI Logic API surface
  }
);

// ── Trigger: Intelligence record created → log governance event ─
export const onIntelligenceCreated = onDocumentCreated(
  'intelligence/{recordId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const intel = snap.data();

    await db.collection('governanceEvents').add({
      id: db.collection('governanceEvents').doc().id,
      occurredAt: new Date().toISOString(),
      actorId: 'system',
      actorType: intel?.inferenceSource === 'cloud-gemini' ? 'ai-cloud' : 'ai-local',
      eventType: 'intelligence-generated',
      payload: {
        intelligenceId: event.params.recordId,
        inspectionId: intel?.inspectionId,
        inferenceSource: intel?.inferenceSource,
        confidence: intel?.confidence,
      },
    });

    logger.info('[MIRROR] Intelligence governance event recorded', {
      recordId: event.params.recordId,
    });
  }
);
