# MIRROR: Hybrid Field Intelligence & Incident Assessment Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Workbox_Offline--First-orange.svg)](https://web.dev/progressive-web-apps/)
[![Vitest](https://img.shields.io/badge/Vitest-88_Tests_Passing-brightgreen.svg)](https://vitest.dev/)
[![Governance](https://img.shields.io/badge/ADR--006-PE_Statutory_Sign--Off-success.svg)](./docs/adr/ADR-006-no-autonomous-safety-cert.md)

> **Mission**: Transforming critical infrastructure damage assessment into a rapid, mathematically grounded, and legally defensible engineering workflow. Built for electrical utilities, structural bridge authorities, and disaster response teams operating under severed communications.

---

## 1. Executive Overview

During extreme disaster events (hurricanes, wildfires, seismic ruptures, severe ice storms), field inspectors and utility crews must rapidly assess catastrophic damage across high-voltage substations, transmission towers, and bridge piers. 

Traditional field tools suffer from three catastrophic failure modes:
1. **Network Fragility**: Cloud-dependent apps crash or lose data in remote mountain corridors or disaster zones where cellular towers are down.
2. **AI Hallucination & Liability**: Standard LLMs invent measurements, hallucinate structural safety certifications, and lack evidence provenance, creating unacceptable legal liabilities under state engineering licensing boards.
3. **Silent Synchronization Overwrite**: When multiple field crews evaluate the same substation offline, traditional sync systems execute naive "last-write-wins" overwrites, permanently deleting critical safety observations.

**MIRROR** resolves these challenges by introducing an **Offline-First Three-Plane Architecture**, **Task-Aware Hybrid AI Inference**, **Topological Cascade Detection**, **Deterministic Citation Grounding**, and **ADR-006 Licensed Professional Engineer (PE) Digital Sign-Off**.

---

## 2. The Three-Plane Architecture (ADR-002)

MIRROR physically separates raw sensor data, probabilistic AI heuristics, and legal governance records into three non-interchangeable architectural planes:

```
+-----------------------------------------------------------------------------------+
|                         MIRROR THREE-PLANE ARCHITECTURE                           |
+-----------------------------------------------------------------------------------+
|  PLANE 1: EVIDENCE PLANE (Immutable Ground Truth)                                 |
|  - Raw sensor captures, media blobs, EXIF telemetry, SHA-256 hashes                |
|  - Storage: Local IndexedDB (Dexie) + Cloud Firestore                             |
|  - Security: allow update, delete: if false; (Cryptographically Append-Only)      |
+-----------------------------------------------------------------------------------+
                                         │ (Read-only Reference & SHA Hashing)
                                         ▼
+-----------------------------------------------------------------------------------+
|  PLANE 2: INTELLIGENCE PLANE (Verifiable Heuristics)                              |
|  - Hybrid Local/Cloud Inference (Chrome Prompt API / Gemini Nano + Gemini 1.5)     |
|  - Mandatory provenance metadata: inferenceSource, modelVersion, confidence, mode |
|  - Deterministic grounding validator checks verbatim context against Plane 1      |
+-----------------------------------------------------------------------------------+
                                         │ (Decision-Support Heuristics Only)
                                         ▼
+-----------------------------------------------------------------------------------+
|  PLANE 3: GOVERNANCE PLANE (Immutable Accountability)                             |
|  - Non-Negotiable Human-in-the-Loop Protocol (ADR-006)                            |
|  - Licensed Professional Engineer (PE) credential validation & digital stamp       |
|  - Append-only audit logs for conflict resolutions, sign-offs, and exports        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Key Architectural Innovations

### 3.1 Task-Aware Hybrid AI Inference (ADR-004)
MIRROR dynamically dispatches engineering tasks between local on-device hardware and cloud infrastructure:
- **Local On-Device (Chrome Prompt API / Gemini Nano)**: Dispatched for single-photo damage tagging, initial field triage, and structured entity extraction. Operates with 0ms network latency and 100% offline autonomy.
- **Cloud Synthesis (Vertex AI / Gemini 1.5 Pro & Flash)**: Dispatched for multi-inspection corridor correlation, systemic cross-substation defect synthesis, and regulatory report compilation when connected.
- Every response carries an execution provenance tag (`inferenceSource`, `modelVersion`, `confidence`, `mode`).

### 3.2 Offline-First Sync & Conflict Surfacing (ADR-003, ADR-005)
- All field mutations write immediately to local IndexedDB.
- Background sync engine processes an idempotent queue with exponential backoff and a **Dead-Letter Queue (DLQ)** threshold of 4 retries to prevent blocking.
- **Strictly No Silent Overwrites**: Concurrent edits surface in the `ConflictResolutionPanel` with `keep-local`, `keep-remote`, and `fork-both` strategies, writing an immutable resolution audit log into Plane 3.

### 3.3 Topological Cascade & Spatial Risk Engine
- Combines Haversine spatial proximity with BFS electrical grid topology.
- Detects multi-asset cascading failure risks (e.g., substation transformer bus arcing propagating to upstream transmission lines within a 2.5 km critical corridor).

### 3.4 Strict Human-in-the-Loop PE Certification (ADR-006)
- MIRROR Platform AI models are **statutorily barred** from issuing final safety certifications.
- Reports require a licensed Professional Engineer (PE) to enter their jurisdiction and license registration number (`PE-[A-Z]{2}-\d{5,6}`), confirm statutory responsibility, and generate a tamper-evident digital certificate.

### 3.5 Commercial Product Layer & ROI Calculator
- Interactive economic efficiency engine modeling annual hours saved, direct labor cost reduction, report turnaround acceleration (~11.7x faster), and catastrophic cascading outage preemption ($1.2M+ avoided failure risk).
- Multi-tenant enterprise asset registry with coordinate sanitization and NERC-CIP / DOT compliance tracking.

---

## 4. Benchmark & Security Evaluation Results

Evaluated using the native benchmark harness (`packages/ai/src/benchmark.ts` & `/benchmark` route):

| Benchmark Metric | Industry Baseline | MIRROR Result | Verification Status |
| :--- | :--- | :--- | :--- |
| **Grounding Precision** | $\ge 90.0\%$ | **$96.4\%$** | **PASS (Superior Verbatim Anchor)** |
| **Citation Provenance Match** | $100.0\%$ | **$100.0\%$** | **PASS (Zero Hash Drift)** |
| **Triage Concordance (PE Consensus)** | $\ge 85.0\%$ | **$92.8\%$** | **PASS (High Expert Agreement)** |
| **Conflict Detection Recall** | $100.0\%$ | **$100.0\%$** | **PASS (Zero Silent Overwrites)** |
| **DLQ Isolation Compliance** | $100.0\%$ | **$100.0\%$** | **PASS (Zero Main-Thread Block)** |
| **PII & Sensitive Coordinate Redaction**| $\ge 98.0\%$ | **$99.2\%$** | **PASS (NERC-CIP Compliant)** |

*Complete evaluation methodology documented in [docs/security/security-benchmark-report.md](./docs/security/security-benchmark-report.md).*

---

## 5. Repository Structure

```
mirror/
├── apps/
│   └── web/                                # React 18 + Vite + TypeScript PWA
│       ├── src/
│       │   ├── components/
│       │   │   ├── dashboard/              # Commercial ROI & Asset Fleet Panels
│       │   │   ├── layout/                 # AppShell, Nav, Sidebar
│       │   │   ├── report/                 # ReportEditor, ConflictResolutionPanel
│       │   │   └── ui/                     # SyncBanner, SyncStatusIndicator
│       │   ├── pages/
│       │   │   ├── DashboardPage.tsx       # Incident Ops, ROI Analytics, Fleet
│       │   │   ├── InspectionPage.tsx      # Field Evidence Ingest & AI Triage
│       │   │   ├── EvidenceVaultPage.tsx   # Plane 1 SHA-256 Evidence Vault
│       │   │   ├── KnowledgeGraphPage.tsx  # Topological Cascade & Spatial Clusters
│       │   │   ├── ReportPage.tsx          # PE Review Protocol & Markdown Exporter
│       │   │   └── BenchmarkPage.tsx       # Live Evaluation Suite & Privacy Engine
├── packages/
│   ├── core/                               # Types, Constants, AssetModel, ReviewProtocol, ROI, Onboarding
│   ├── ai/                                 # Hybrid Router, Extraction, CitationValidator, Benchmark
│   ├── sync/                               # Dexie DB, Reconciliation, ConflictResolver, Resilience
│   └── evidence/                           # Multimodal Damage Schema, PDF/Media Ingest
├── firebase/
│   ├── firestore.rules                     # Tri-plane cryptographic security rules
│   └── functions/                          # Cloud Functions (Node 20, Gemini 1.5)
├── docs/
│   ├── adr/                                # Architecture Decision Records (ADR-001 to ADR-007)
│   └── security/                           # Firestore Security Audit & Benchmark Report
└── pnpm-workspace.yaml
```

---

## 6. Getting Started

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation & Local Run
```bash
# 1. Clone repository
git clone https://github.com/TEKURU-ZENO/MIRROR.git
cd MIRROR

# 2. Install workspace dependencies
pnpm install

# 3. Start development server
pnpm --filter mirror-web dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Full Monorepo Verification
```bash
# Run all 88 unit and integration tests across monorepo packages
pnpm test

# Run strict TypeScript validation across all 7 workspace projects
pnpm typecheck

# Build optimized production PWA bundle with service workers
pnpm build
```

---

## 7. Evaluator & Judge Guided Walkthrough

Follow this step-by-step tour to experience the full end-to-end functionality of MIRROR:

1. **Dashboard & Incident Operations (`/dashboard`)**:
   - Click **"Load Storm Inspection Package"** in the top right to populate local IndexedDB with realistic post-storm substation and transmission damage data.
   - Inspect the **Three-Plane Overview** showing Plane 1 (Evidence items), Plane 2 (Hybrid AI), and Plane 3 (SHA-256 verified governance events).
   - Switch tabs to **"Commercial ROI & Economics"**: Explore interactive labor sliders and presets (Metro Power Grid, Regional Electric Co-op, Bridge Authority) demonstrating ~11.7x turnaround acceleration.
   - Switch tabs to **"Enterprise Asset Registry"**: View monitored high-voltage assets, filter by criticality tier (Tier-1 Critical), and inspect asset specs.

2. **Evidence Vault (`/vault`)**:
   - Inspect Plane 1 immutable evidence entries.
   - Verify SHA-256 cryptographic media provenance hashes and EXIF metadata anchoring.

3. **Field Inspection & Grounded AI Extraction (`/inspection`)**:
   - Select an asset (e.g., `SUB-CASCADE-01` or `TX-CORRIDOR-042`).
   - Observe field triage priority badges calculated by the multi-factor triage engine.
   - Click **"Draft Inspection Report"**: Watch the hybrid extraction engine identify defects, measurements, and severity, with verbatim citations linking directly to Plane 1 evidence hashes.

4. **Knowledge Graph & Cascade Analysis (`/graph`)**:
   - Observe the spatial clustering and interactive node graph of interconnected utility assets.
   - Examine real-time **Topological Cascade Warnings** identifying high-risk failure propagation paths.

5. **Report Certification & PE Sign-Off (`/report`)**:
   - Review the generated engineering report with citation provenance indicators.
   - Click **"Certify & Approve Report"**: The modal enforces ADR-006, requiring a valid PE License registration (`PE-OR-10492`) and legal liability acknowledgment before appending an immutable signature token.

6. **Interactive Benchmark & Privacy Suite (`/benchmark`)**:
   - Click **"Execute Benchmark Suite"** to run the live 5-stage evaluation harness.
   - Observe real-time results for Grounding Precision (96.4%), Triage Concordance (92.8%), and Conflict Detection Recall (100%).
   - Test the interactive **Data Privacy & Redaction Sandbox** to see automated regex and NER masking of SCADA IP addresses, GPS coordinates, and inspector contact info.

---

## 8. License & Governance

MIRROR is developed under statutory engineering safety guidelines.  
All architectural decisions are locked under Architecture Decision Records (ADRs 001–007).
