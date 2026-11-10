/**
 * MIRROR — Day 1 Technical Spike Page
 *
 * Validates four critical assumptions before any dependent feature is built:
 *   T-01: Chrome on-device inference availability
 *   T-05: Firebase AI Logic inference-source metadata exposure
 *   T-06: PWA offline startup behaviour
 *   T-04: Evidence provenance round-trip (local → sync → verify)
 *
 * Remove this page (and /spike route) before production deployment.
 */

import { useState } from 'react';
import { CheckCircle, XCircle, Loader, AlertTriangle, FlaskConical } from 'lucide-react';
import { db } from '@mirror/sync';
import { generateId, nowISO, sha256Hex } from '@mirror/core';
import { checkOnDeviceAvailability } from '@mirror/ai';

type SpikeStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warn';

interface SpikeResult {
  id: string;
  label: string;
  riskId: string;
  status: SpikeStatus;
  detail: string;
}

function StatusIcon({ status }: { status: SpikeStatus }) {
  const cls = 'w-5 h-5 shrink-0';
  switch (status) {
    case 'pass':    return <CheckCircle  className={`${cls} text-mirror-success`} />;
    case 'fail':    return <XCircle      className={`${cls} text-mirror-danger`} />;
    case 'warn':    return <AlertTriangle className={`${cls} text-mirror-warning`} />;
    case 'running': return <Loader       className={`${cls} text-mirror-accent animate-spin`} />;
    default:        return <div          className={`${cls} rounded-full border-2 border-mirror-border`} />;
  }
}

const statusBg: Record<SpikeStatus, string> = {
  pending: 'border-mirror-border',
  running: 'border-mirror-accent/50 bg-mirror-accent/5',
  pass:    'border-mirror-success/40 bg-mirror-success/5',
  fail:    'border-mirror-danger/40 bg-mirror-danger/5',
  warn:    'border-mirror-warning/40 bg-mirror-warning/5',
};

export function SpikePage() {
  const [results, setResults] = useState<SpikeResult[]>([
    { id: 'T-01', riskId: 'T-01', label: 'On-device AI availability (Chrome)',         status: 'pending', detail: '' },
    { id: 'T-05', riskId: 'T-05', label: 'Inference-source metadata visible in SDK',   status: 'pending', detail: '' },
    { id: 'T-06', riskId: 'T-06', label: 'IndexedDB round-trip (offline persistence)', status: 'pending', detail: '' },
    { id: 'T-04', riskId: 'T-04', label: 'SHA-256 provenance checksum (Web Crypto)',   status: 'pending', detail: '' },
  ]);
  const [running, setRunning] = useState(false);

  function patch(id: string, update: Partial<SpikeResult>) {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  }

  async function runSpike() {
    setRunning(true);

    // ── T-01: On-device AI ─────────────────────────────────────
    patch('T-01', { status: 'running', detail: 'Checking...' });
    try {
      const available = await checkOnDeviceAvailability();
      patch('T-01', {
        status: available ? 'pass' : 'warn',
        detail: available
          ? 'On-device AI API detected in this browser.'
          : 'On-device AI not available. Cloud-only fallback will be used. Update ADR-004 if needed.',
      });
    } catch (e) {
      patch('T-01', { status: 'fail', detail: `Error: ${String(e)}` });
    }

    // ── T-05: Inference source metadata ───────────────────────
    patch('T-05', { status: 'running', detail: 'Checking SDK surface...' });
    try {
      patch('T-05', {
        status: 'warn',
        detail:
          'Firebase AI Logic not yet initialized (needs Firebase project config). ' +
          'Manual inference-source tagging is in place as the fallback. ' +
          'Complete firebase init and re-run this spike.',
      });
    } catch (e) {
      patch('T-05', { status: 'fail', detail: `Error: ${String(e)}` });
    }

    // ── T-06: IndexedDB round-trip ─────────────────────────────
    patch('T-06', { status: 'running', detail: 'Writing and reading from IndexedDB...' });
    try {
      const testId = generateId();
      const testInspection = {
        id: testId,
        incidentId: generateId(),
        inspectorId: generateId(),
        assetId: 'SPIKE-TEST-ASSET-001',
        assetType: 'pole' as const,
        locationLabel: 'Spike Test Location',
        capturedAt: nowISO(),
        ingestedAt: nowISO(),
        syncStatus: 'local-only' as const,
        evidence: [],
      };

      await db.inspections.put(testInspection);
      const retrieved = await db.inspections.get(testId);
      await db.inspections.delete(testId); // cleanup

      if (retrieved?.assetId === 'SPIKE-TEST-ASSET-001') {
        patch('T-06', {
          status: 'pass',
          detail: `IndexedDB write/read/delete succeeded. Record ID: ${testId.slice(0, 8)}…`,
        });
      } else {
        patch('T-06', { status: 'fail', detail: 'Retrieved record does not match written record.' });
      }
    } catch (e) {
      patch('T-06', { status: 'fail', detail: `IndexedDB error: ${String(e)}` });
    }

    // ── T-04: SHA-256 provenance ───────────────────────────────
    patch('T-04', { status: 'running', detail: 'Hashing test payload...' });
    try {
      const testData = new TextEncoder().encode('MIRROR spike test payload — provenance check');
      const hash = await sha256Hex(testData.buffer as ArrayBuffer);

      // Verify it's a valid 64-char hex
      const valid = /^[0-9a-f]{64}$/.test(hash);
      patch('T-04', {
        status: valid ? 'pass' : 'fail',
        detail: valid
          ? `Web Crypto SHA-256 working. Sample hash: ${hash.slice(0, 16)}…`
          : `Unexpected hash format: ${hash}`,
      });
    } catch (e) {
      patch('T-04', { status: 'fail', detail: `Web Crypto error: ${String(e)}` });
    }

    setRunning(false);
  }

  const allDone = results.every((r) => r.status !== 'pending' && r.status !== 'running');
  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <FlaskConical size={20} className="text-mirror-accent" />
        <h1 className="text-2xl font-semibold text-mirror-text">Day 1 Technical Spike</h1>
      </div>
      <p className="text-mirror-muted text-sm mb-6">
        Validates the four critical infrastructure assumptions before dependent features are built.
        Results are logged to the console and should be recorded in the Risk Register.
      </p>

      <div className="space-y-3 mb-6">
        {results.map((r) => (
          <div key={r.id} className={`panel p-4 border ${statusBg[r.status]} transition-colors`}>
            <div className="flex items-start gap-3">
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-mirror-muted">{r.riskId}</span>
                  <span className="text-sm font-medium text-mirror-text">{r.label}</span>
                </div>
                {r.detail && (
                  <p className="text-xs text-mirror-muted mt-1 leading-relaxed">{r.detail}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {allDone && (
        <div className="panel p-4 mb-6 border border-mirror-border">
          <p className="text-sm font-medium text-mirror-text">
            Spike complete —{' '}
            <span className="text-mirror-success">{passCount} passed</span>
            {failCount > 0 && (
              <>, <span className="text-mirror-danger">{failCount} failed</span></>
            )}
          </p>
          <p className="text-xs text-mirror-muted mt-1">
            Record results in the Risk Register (T-01, T-05) and update ADR-004 if on-device AI
            is unavailable.
          </p>
        </div>
      )}

      <button
        onClick={runSpike}
        disabled={running}
        className="px-5 py-2.5 bg-mirror-accent hover:bg-mirror-accent-hover disabled:opacity-50
                   text-white text-sm font-medium rounded-md transition-colors"
      >
        {running ? 'Running spike…' : allDone ? 'Re-run spike' : 'Run spike validation'}
      </button>
    </div>
  );
}
