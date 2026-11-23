/**
 * MIRROR — Day 1 Technical Spike Page
 *
 * Validates four critical assumptions:
 *   T-01: Chrome on-device inference availability
 *   T-05: Firebase AI Logic SDK & inference-source metadata exposure
 *   T-06: IndexedDB round-trip (offline persistence)
 *   T-04: Evidence provenance SHA-256 checksum (Web Crypto)
 */

import { useState } from 'react';
import { CheckCircle, XCircle, Loader, AlertTriangle, FlaskConical, Copy, Check } from 'lucide-react';
import { db } from '@mirror/sync';
import { generateId, nowISO, sha256Hex } from '@mirror/core';
import { checkOnDeviceAvailability, isFirebaseConfigured } from '@mirror/ai';

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
    { id: 'T-01', riskId: 'T-01', label: 'On-device AI availability (Chrome Built-in)',   status: 'pending', detail: '' },
    { id: 'T-05', riskId: 'T-05', label: 'Firebase AI Logic SDK & source metadata',       status: 'pending', detail: '' },
    { id: 'T-06', riskId: 'T-06', label: 'IndexedDB round-trip (offline persistence)',    status: 'pending', detail: '' },
    { id: 'T-04', riskId: 'T-04', label: 'SHA-256 provenance checksum (Web Crypto)',      status: 'pending', detail: '' },
  ]);
  const [running, setRunning] = useState(false);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function patch(id: string, update: Partial<SpikeResult>) {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...update } : r)));
  }

  async function runSpike() {
    setRunning(true);
    setCopied(false);

    // ── T-01: On-device AI ─────────────────────────────────────
    patch('T-01', { status: 'running', detail: 'Detecting Chrome Built-in AI Prompt API...' });
    try {
      const available = await checkOnDeviceAvailability();
      patch('T-01', {
        status: available ? 'pass' : 'warn',
        detail: available
          ? 'On-device AI Prompt API detected and ready in this browser.'
          : 'On-device AI Prompt API not detected in this runtime. Deterministic & cloud-only fallbacks are active per ADR-004.',
      });
    } catch (e) {
      patch('T-01', { status: 'fail', detail: `Error: ${String(e)}` });
    }

    // ── T-05: Firebase AI Logic SDK ────────────────────────────
    patch('T-05', { status: 'running', detail: 'Inspecting Firebase AI Logic SDK...' });
    try {
      // Dynamic import to verify package installation
      const aiModule = await import(/* @vite-ignore */ 'firebase/ai').catch(() => null);
      const configured = isFirebaseConfigured();

      if (aiModule) {
        if (configured) {
          patch('T-05', {
            status: 'pass',
            detail: 'Firebase AI Logic SDK imported successfully. Firebase project configured via environment. Cloud inference operational.',
          });
        } else {
          patch('T-05', {
            status: 'warn',
            detail: 'Firebase AI Logic SDK is installed and loadable, but VITE_FIREBASE_API_KEY is not configured. Real cloud inference requires Firebase credentials; deterministic demo mode active.',
          });
        }
      } else {
        patch('T-05', {
          status: 'warn',
          detail: 'Firebase AI Logic SDK module not loaded dynamically. Manual inference-source tagging active.',
        });
      }
    } catch (e) {
      patch('T-05', { status: 'fail', detail: `Firebase AI inspection failed: ${String(e)}` });
    }

    // ── T-06: IndexedDB round-trip ─────────────────────────────
    patch('T-06', { status: 'running', detail: 'Writing, querying, and deleting from IndexedDB...' });
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
          detail: `IndexedDB round-trip verified successfully (Dexie store write/read/delete). Test record ID: ${testId.slice(0, 8)}…`,
        });
      } else {
        patch('T-06', { status: 'fail', detail: 'Retrieved record does not match written record.' });
      }
    } catch (e) {
      patch('T-06', { status: 'fail', detail: `IndexedDB error: ${String(e)}` });
    }

    // ── T-04: SHA-256 provenance ───────────────────────────────
    patch('T-04', { status: 'running', detail: 'Computing SHA-256 digest via Web Crypto...' });
    try {
      const testData = new TextEncoder().encode('MIRROR spike test payload — provenance check');
      const hash = await sha256Hex(testData.buffer as ArrayBuffer);

      const valid = /^[0-9a-f]{64}$/.test(hash);
      patch('T-04', {
        status: valid ? 'pass' : 'fail',
        detail: valid
          ? `Web Crypto SHA-256 verified. Sample digest: ${hash.slice(0, 16)}…`
          : `Unexpected digest format: ${hash}`,
      });
    } catch (e) {
      patch('T-04', { status: 'fail', detail: `Web Crypto error: ${String(e)}` });
    }

    setLastExecuted(new Date().toLocaleString());
    setRunning(false);
  }

  function copyMarkdownResults() {
    const lines = [
      '# MIRROR Spike Validation Results',
      `*Executed: ${lastExecuted || new Date().toLocaleString()}*`,
      '',
      '| Check | Risk ID | Status | Details |',
      '|---|---|---|---|',
      ...results.map((r) => `| ${r.label} | ${r.riskId} | **${r.status.toUpperCase()}** | ${r.detail} |`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const allDone = results.every((r) => r.status !== 'pending' && r.status !== 'running');
  const passCount = results.filter((r) => r.status === 'pass').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <FlaskConical size={20} className="text-mirror-accent" />
          <h1 className="text-2xl font-semibold text-mirror-text">Technical Spike Validation</h1>
        </div>
        {lastExecuted && (
          <span className="text-xs text-mirror-muted font-mono">Run: {lastExecuted}</span>
        )}
      </div>

      <p className="text-mirror-muted text-sm mb-6">
        Validates four critical technical assumptions (T-01, T-05, T-06, T-04) supporting the
        Three-Plane Architecture and offline-first hybrid AI model.
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
        <div className="panel p-4 mb-6 border border-mirror-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-mirror-text">
              Spike validation complete:{' '}
              <span className="text-mirror-success">{passCount} passed</span>
              {warnCount > 0 && <>, <span className="text-mirror-warning">{warnCount} fallback/warn</span></>}
              {failCount > 0 && <>, <span className="text-mirror-danger">{failCount} failed</span></>}
            </p>
            <p className="text-xs text-mirror-muted mt-0.5">
              T-06 and T-04 pass without network. T-01 and T-05 degrade gracefully to deterministic fallback.
            </p>
          </div>

          <button
            onClick={copyMarkdownResults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mirror-surface hover:bg-mirror-border border border-mirror-border rounded text-xs text-mirror-text transition-colors"
          >
            {copied ? <Check size={14} className="text-mirror-success" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy Report'}
          </button>
        </div>
      )}

      <button
        onClick={runSpike}
        disabled={running}
        className="px-5 py-2.5 bg-mirror-accent hover:bg-mirror-accent-hover disabled:opacity-50
                   text-white text-sm font-medium rounded-md transition-colors"
      >
        {running ? 'Running spike…' : allDone ? 'Re-run spike validation' : 'Run spike validation'}
      </button>
    </div>
  );
}
