# ADR-005: Idempotent Sync Events & Surfaced Conflict Reconciliation

- **Status**: Accepted & Locked
- **Date**: 2026-11-09
- **Author**: MIRROR Architecture Team

## Context
When multiple field crews assess the same damaged substation or bridge simultaneously in offline conditions, reconverging their edits upon reconnection often causes silent "last-write-wins" overwrites, resulting in catastrophic loss of critical defect notes.

## Decision
- Prohibit silent automated overwrites under all circumstances.
- Use 3-way vector clock and timestamp comparison (`reconcileRecords`).
- When a concurrent modification occurs, mark the record with `syncStatus: 'conflict'` and present the inspector with the `ConflictResolutionPanel`.
- Available resolution strategies: `keep-local`, `keep-remote`, and `fork-both`.
- Every resolution writes an immutable event into Plane 3 (Governance Plane).

## Consequences
- Guaranteed zero silent data loss.
- Total transparency and defensibility for incident investigations.
