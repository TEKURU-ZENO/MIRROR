import { describe, it, expect, beforeEach } from 'vitest';
import { ingestFile } from './ingest.js';
import { db } from '@mirror/sync';

describe('Evidence Ingestion Engine', () => {
  beforeEach(async () => {
    await db.evidenceItems.clear();
    await db.provenance.clear();
    await db.governanceEvents.clear();
  });

  it('rejects unsupported file MIME types', async () => {
    const file = new File(['binary exe content'], 'malware.exe', { type: 'application/x-msdownload' });
    await expect(ingestFile(file, 'insp-1', 'inspector-1')).rejects.toThrow('Unsupported file type');
  });

  it('ingests supported text/plain file, computes SHA-256, and stores in Dexie', async () => {
    const content = 'Transformer 3 oil leakage observed on ground plate.';
    const file = new File([content], 'notes.txt', { type: 'text/plain' });

    const result = await ingestFile(file, 'insp-100', 'inspector-200', 'Immediate action advised');

    expect(result.evidenceItem.id).toBeDefined();
    expect(result.evidenceItem.type).toBe('note');
    expect(result.evidenceItem.mimeType).toBe('text/plain');
    expect(result.evidenceItem.filename).toBe('notes.txt');
    expect(result.evidenceItem.fieldNotes).toBe('Immediate action advised');
    expect(result.evidenceItem.checksum).toHaveLength(64);

    // Verify Dexie persistence
    const storedItem = await db.evidenceItems.get(result.evidenceItem.id);
    expect(storedItem).toBeDefined();
    expect(storedItem?.checksum).toBe(result.evidenceItem.checksum);

    // Verify Provenance
    const storedProv = await db.provenance.get(result.evidenceItem.id);
    expect(storedProv).toBeDefined();
    expect(storedProv?.capturedBy).toBe('inspector-200');
    expect(storedProv?.checksum).toBe(result.evidenceItem.checksum);

    // Verify Governance Event logged
    const govEvents = await db.governanceEvents.toArray();
    expect(govEvents.length).toBeGreaterThanOrEqual(1);
    expect(govEvents[0].eventType).toBe('evidence-ingested');
  });
});
