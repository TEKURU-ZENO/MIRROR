# ADR-003: Offline-First Architecture with IndexedDB and Dexie.js

- **Status**: Accepted & Locked
- **Date**: 2026-11-09
- **Author**: MIRROR Architecture Team

## Context
Utility substations and storm damage zones frequently suffer from complete telecommunication infrastructure failure (downed towers, saturated cellular networks). A field assessment tool that blocks or drops data during network disconnection is hazardous and unusable.

## Decision
Adopt an offline-first architecture powered by Dexie.js (IndexedDB wrapper) with background service worker synchronization:
- All mutations (inspections, media captures, triage assessments) are written immediately to local IndexedDB.
- An asynchronous sync engine processes an idempotent queue with exponential backoff and dead-letter queue (DLQ) isolation.

## Consequences
- 100% full application functionality when totally severed from the internet.
- Zero data loss guarantee during unexpected browser closures or field device reboots.
