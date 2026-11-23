# ADR-002: Three-Plane Data Architecture

- **Status**: Accepted & Locked
- **Date**: 2026-11-09
- **Author**: MIRROR Architecture Team

## Context
Blending raw sensor inputs, AI-synthesized inferences, and legal liability approvals into a single mutable document schema leads to data corruption, hallucination leakage into certified records, and untraceable revision histories under subpoena.

## Decision
Enforce a strict Three-Plane Data Architecture:
1. **Plane 1 (Evidence Plane)**: Immutable ground truth. Raw photos, thermal maps, sensor telemetry, and hashes. Write-once, read-only. Deletions and updates are mathematically blocked in database security rules.
2. **Plane 2 (Intelligence Plane)**: Source-tagged, ephemeral heuristics. Contains outputs from local or cloud AI models, tagged with model version, inference source, confidence score, and mode (`real`, `mock`, `demo`). Must cite Plane 1 evidence hashes.
3. **Plane 3 (Governance Plane)**: Append-only accountability audit log. Records conflict resolutions, report approvals, digital signatures, and regulatory certification events.

## Consequences
- Impossible for AI models to mutate raw inspection evidence.
- Full provenance for every statement in an engineering report.
