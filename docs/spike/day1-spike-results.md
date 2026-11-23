# MIRROR — Spike Results Log
*Day 1 Technical Spike & Phase 2 Stabilization*
*Status: ✅ Completed & Recorded (2026-11-23)*

---

## 1. Overview & Verification Summary

The four technical spikes establish the feasibility of the Three-Plane Architecture, offline resilience, and hybrid AI model for MIRROR:

| Spike ID | Target Assumption | Status | Impact on Architecture |
|---|---|---|---|
| **T-01** | Chrome On-device AI (Prompt API) | ⚠️ WARN / Fallback | Built-in AI capability check implemented; deterministic rule fallback handles unprovisioned environments per ADR-004. |
| **T-05** | Firebase AI Logic SDK & Source Metadata | ⚠️ WARN / Demo Mode | SDK installed and importable; manual source & mode tagging (`real` / `mock` / `demo`) implemented and visibly distinguished in UI. |
| **T-06** | IndexedDB Offline Persistence Round-trip | ✅ PASS | Verified via Dexie.js write/query/delete lifecycle; persists across offline sessions. |
| **T-04** | SHA-256 Provenance Checksum (Web Crypto) | ✅ PASS | Verified via `crypto.subtle.digest('SHA-256')`; deterministic 64-character lowercase hex digest. |

---

## 2. Detailed Spike Results

### T-01 — Chrome on-device inference availability
- **Target**: Validate whether the browser provides local execution via the Chrome Built-in AI Prompt API (`globalThis.ai.languageModel`).
- **Observed Result**: The API is gated behind Chrome Origin Trials / Canary flags (`chrome://flags/#prompt-api-for-gemini-nano`). When not provisioned, `checkOnDeviceAvailability()` safely returns `false`.
- **System Behavior**: `generateText()` gracefully falls back to cloud Gemini when configured, or to local deterministic rule analysis when completely offline.
- **Action Taken**: Implemented `generateLocalText()`, capability detection, and deterministic rule-engine fallback in `packages/ai/src/inference.ts`. Verified with automated unit tests.

---

### T-05 — Firebase AI Logic inference-source metadata
- **Target**: Confirm whether Firebase AI Logic exposes model execution metadata, duration, and source tagging.
- **Observed Result**: Firebase AI Logic SDK (`firebase/ai`) imports cleanly in the Vite environment. The current SDK version does not natively tag local vs cloud origins in the return payload.
- **System Behavior**: MIRROR wraps every response in `AIResponse`, capturing:
  - `inferenceSource`: `'local-on-device' | 'cloud-gemini' | 'deterministic' | 'human'`
  - `mode`: `'real' | 'mock' | 'demo'`
  - `confidence`: numeric score `0.0–1.0`
  - `durationMs`: execution time via `performance.now()`
  - `modelVersion`: model identifier (e.g., `gemini-2.0-flash` or `chrome-builtin-gemini-nano`)
- **Action Taken**: Built-in visual indicator added to `IntelligenceTrace.tsx` showing `[Live Inference]` vs `[Simulated/Demo]` badges.

---

### T-06 — IndexedDB round-trip (offline persistence)
- **Target**: Confirm that field observations, inspections, and evidence references persist locally without network connectivity.
- **Observed Result**: IndexedDB via Dexie (`mirror-db`) successfully handles transactional writes, indexed lookups, and lifecycle deletes in both headless environments (`fake-indexeddb`) and modern browsers.
- **System Behavior**: All incoming field data is committed to IndexedDB before any network sync is attempted.
- **Action Taken**: 9-table schema verified; unit tests in `packages/sync/src/syncEngine.test.ts` verify queue operations and idempotency.

---

### T-04 — SHA-256 provenance checksum (Web Crypto)
- **Target**: Validate that field evidence files can be hashed client-side with standard Web Crypto API without external native dependencies.
- **Observed Result**: `crypto.subtle.digest('SHA-256', buffer)` produces deterministic 64-character hex digests across browser and Node 20+ environments.
- **System Behavior**: Checksums are computed during `ingestFile()` and permanently bound to both the `EvidenceItem` and the immutable `Provenance` record.
- **Action Taken**: Verified with test suite in `packages/core/src/utils.test.ts` and `packages/evidence/src/ingest.test.ts`.

---

## 3. Spike Closure Decision

All four spike criteria have verified operational paths:
- T-06 (Persistence) and T-04 (Evidence Integrity) **PASS** unconditionally.
- T-01 and T-05 are stabilized with multi-tier fallback, transparent source tagging, and explicit execution mode indicators.
- Phase 2 exit criteria for spike validation are fully met.
