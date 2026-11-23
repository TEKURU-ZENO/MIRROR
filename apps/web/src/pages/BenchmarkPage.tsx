// MIRROR — Benchmark & Evaluation Page
// Interactive harness executing the infrastructure intelligence benchmark suite,
// displaying Grounding Precision, Conflict Recall, Triage Concordance, and Privacy Redaction.

import { useState } from 'react';
import {
  Gauge,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Lock,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  runBenchmarkSuite,
  type BenchmarkSuiteResult,
} from '@mirror/ai';
import { redactPII } from '@mirror/core';

export function BenchmarkPage() {
  const [suiteResult, setSuiteResult] = useState<BenchmarkSuiteResult | null>(null);
  const [running, setRunning] = useState(false);

  // Privacy Redactor Sandbox State
  const [sandboxInput, setSandboxInput] = useState(
    'Contact field engineer Sarah Connor at s.connor@gridcorp.com or 555-839-2001. Pole 42 leaning 14 deg with 45 psi leakage.'
  );
  const [redactedOutput, setRedactedOutput] = useState<{ text: string; count: number } | null>(null);

  const handleRunBenchmark = async () => {
    setRunning(true);
    try {
      const res = await runBenchmarkSuite();
      setSuiteResult(res);
    } finally {
      setRunning(false);
    }
  };

  const handleTestRedaction = () => {
    const res = redactPII(sandboxInput);
    setRedactedOutput({ text: res.redactedText, count: res.piiItemsCount });
  };

  return (
    <div className="max-w-4xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-6 h-6 text-mirror-accent" />
            <h1 className="text-2xl font-semibold text-mirror-text">
              System Evaluation & Benchmark Harness
            </h1>
          </div>
          <p className="text-mirror-muted text-sm mt-1">
            Validates Grounding Precision, Conflict Detection Recall, Triage Concordance, and Privacy Guardrails against standardized infrastructure scenarios.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRunBenchmark()}
          disabled={running}
          className="px-4 py-2 rounded-md bg-mirror-accent hover:bg-mirror-accent-hover text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {running ? 'Evaluating Scenarios…' : 'Run Benchmark Suite'}
        </button>
      </div>

      {/* Benchmark Summary Metrics */}
      {suiteResult && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="panel p-4 space-y-1 border border-mirror-border bg-mirror-surface/60">
            <span className="text-xs font-mono uppercase text-mirror-muted">Composite Benchmark</span>
            <div className="text-2xl font-bold font-mono text-mirror-success">
              {suiteResult.compositeScore}%
            </div>
            <p className="text-[11px] text-mirror-muted">
              {suiteResult.passedScenarios} of {suiteResult.totalScenarios} scenarios passing
            </p>
          </div>

          <div className="panel p-4 space-y-1 border border-mirror-border bg-mirror-surface/60">
            <span className="text-xs font-mono uppercase text-mirror-muted">Evaluation Standard</span>
            <div className="text-sm font-semibold text-mirror-text flex items-center gap-1.5 pt-1">
              <ShieldCheck size={16} className="text-mirror-accent" />
              PE Disaster Ground Truth
            </div>
            <p className="text-[11px] text-mirror-muted">
              ADR-004 / ADR-006 verified
            </p>
          </div>

          <div className="panel p-4 space-y-1 border border-mirror-border bg-mirror-surface/60">
            <span className="text-xs font-mono uppercase text-mirror-muted">Last Executed</span>
            <div className="text-sm font-mono text-mirror-text flex items-center gap-1.5 pt-1">
              <Clock size={16} className="text-mirror-muted" />
              {new Date(suiteResult.executedAt).toLocaleTimeString()}
            </div>
            <p className="text-[11px] text-mirror-muted truncate">
              Automated offline & cloud harness
            </p>
          </div>
        </div>
      )}

      {/* Scenario Evaluation Cards */}
      {suiteResult && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-mirror-text uppercase tracking-wider">
            Evaluated Scenario Details
          </h2>
          <div className="space-y-3">
            {suiteResult.scenarios.map((scen) => (
              <div
                key={scen.scenarioId}
                className={`panel p-4 border transition-all ${
                  scen.passed
                    ? 'border-mirror-success/30 bg-mirror-success/5'
                    : 'border-mirror-danger/30 bg-mirror-danger/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {scen.passed ? (
                        <CheckCircle2 size={16} className="text-mirror-success" />
                      ) : (
                        <XCircle size={16} className="text-mirror-danger" />
                      )}
                      <span className="font-semibold text-sm text-mirror-text">{scen.title}</span>
                      <span className="text-xs font-mono text-mirror-muted">({scen.scenarioId})</span>
                    </div>
                    <p className="text-xs text-mirror-muted pl-6">{scen.details}</p>
                  </div>
                  <span className="text-xs font-mono text-mirror-muted shrink-0">
                    {scen.metrics.durationMs}ms
                  </span>
                </div>

                {/* Metric Badges */}
                <div className="flex items-center gap-2 flex-wrap pl-6 pt-3 text-xs">
                  <span className="px-2 py-0.5 rounded bg-mirror-surface border border-mirror-border font-mono text-[11px]">
                    Grounding Precision: {Math.round(scen.metrics.groundingPrecision * 100)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-mirror-surface border border-mirror-border font-mono text-[11px]">
                    Citation Integrity: {Math.round(scen.metrics.citationIntegrityScore * 100)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-mirror-surface border border-mirror-border font-mono text-[11px]">
                    Triage Concordance: {scen.metrics.triageConcordance ? '100% (Match)' : 'Mismatch'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Privacy & Sovereign Asset Redaction Sandbox */}
      <div className="panel p-5 space-y-4 border border-mirror-border">
        <div className="flex items-center gap-2 border-b border-mirror-border pb-3">
          <Lock size={18} className="text-mirror-accent" />
          <div>
            <h2 className="text-sm font-semibold text-mirror-text">
              Data Privacy & Sovereign Redaction Engine Sandbox
            </h2>
            <p className="text-xs text-mirror-muted">
              Live test of PII stripping and sovereign infrastructure metadata sanitation prior to cloud sync.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs text-mirror-muted block">Field Notes Input (with PII & Engineering Metrics):</label>
          <textarea
            value={sandboxInput}
            onChange={(e) => setSandboxInput(e.target.value)}
            rows={2}
            className="w-full bg-mirror-bg border border-mirror-border rounded p-2.5 text-xs text-mirror-text font-mono focus:outline-none focus:border-mirror-accent resize-none"
          />

          <button
            type="button"
            onClick={handleTestRedaction}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-mirror-accent/20 text-mirror-accent hover:bg-mirror-accent/30 transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            Execute Privacy Redaction Test
          </button>

          {redactedOutput && (
            <div className="p-3 rounded bg-mirror-surface border border-mirror-border space-y-1 text-xs">
              <div className="flex items-center justify-between text-[11px] text-mirror-muted font-mono">
                <span>Sanitized Output:</span>
                <span className="text-mirror-success">{redactedOutput.count} PII identifiers masked</span>
              </div>
              <p className="text-mirror-text font-mono text-xs bg-mirror-bg p-2 rounded border border-mirror-border">
                {redactedOutput.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
