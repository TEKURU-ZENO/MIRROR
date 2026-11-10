# MIRROR
> Hybrid Field Intelligence & Incident Assessment Platform

## Structure

```
mirror/
├── apps/
│   └── web/              # React + Vite + TypeScript PWA
├── packages/
│   ├── core/             # Shared types, constants, utilities
│   ├── ai/               # Firebase AI Logic wrappers (local + cloud)
│   ├── sync/             # Offline sync, conflict detection
│   └── evidence/         # Evidence ingestion, PDF.js, provenance
├── firebase/
│   ├── functions/        # Cloud Functions (Node 20)
│   └── firestore.rules   # Security rules
├── docs/
│   ├── adr/              # Architecture Decision Records
│   └── spike/            # Technical spike results
└── pnpm-workspace.yaml
```

## Quick Start

```bash
pnpm install
pnpm --filter web dev
```

## Engineering Governance
See `docs/` for the Engineering Decision Log, Risk Register, and Spike Results.
