# ADR-007: Technology Stack & Monorepo Tooling Lock

- **Status**: Accepted & Locked
- **Date**: 2026-11-09
- **Author**: MIRROR Architecture Team

## Context
A field intelligence system requires deterministic type safety across client and server boundaries, fast offline hydration, low bundle overhead, and reliable local caching.

## Decision
Lock the technical architecture to:
- **Monorepo**: pnpm workspaces (`apps/web`, `packages/core`, `packages/ai`, `packages/sync`, `packages/evidence`, `firebase/functions`).
- **Frontend**: React 18, Vite 5, TypeScript 5.4, Tailwind CSS, Lucide icons.
- **PWA / Offline**: `vite-plugin-pwa` with Workbox Service Worker, Dexie.js (IndexedDB wrapper).
- **Backend & Cloud**: Firebase Firestore (with custom security rules), Cloud Functions (Node 20).
- **AI Runtimes**: Chrome Prompt API (on-device local) + Google Cloud Vertex / Gemini 1.5 Pro / Flash.
- **Testing**: Vitest across all workspace packages with `fake-indexeddb`.

## Consequences
- Single unified TypeScript type contract across offline client, hybrid AI, and cloud backend.
- Fast, sub-second HMR development and sub-8-second production builds.
