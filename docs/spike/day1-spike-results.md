# MIRROR — Spike Results Log
*Day 1 Technical Spike — 2026-11-09*
*Status: 🔄 In Progress*

---

## Instructions
Run the spike by opening the app at `/spike` and clicking **Run spike validation**.
Record the results for each check below after they complete.

---

## Results

### T-01 — Chrome on-device inference availability
**Status**: ⬜ Not yet run
**Outcome**: —
**Action Required**: —

---

### T-05 — Firebase AI Logic inference-source metadata
**Status**: ⬜ Not yet run
**Outcome**: —
**Action Required**: —

> [!IMPORTANT]
> This check requires a Firebase project to be initialized. Run `firebase init` and populate `.env.local` before this test becomes meaningful.

---

### T-06 — IndexedDB round-trip (offline persistence)
**Status**: ⬜ Not yet run
**Outcome**: —
**Action Required**: —

---

### T-04 — SHA-256 provenance checksum (Web Crypto)
**Status**: ⬜ Not yet run
**Outcome**: —
**Action Required**: —

---

## Spike Closure Decision

| All 4 pass | Proceed to Phase 1 as designed |
|---|---|
| T-01 fails | Update ADR-004: cloud-only with offline queue; revise UI copy |
| T-05 fails | Manual inference-source tagging remains in place (already built); document the gap |
| T-06 fails | Critical blocker — investigate browser storage policy before proceeding |
| T-04 fails | Critical blocker — Web Crypto unavailable; evaluate alternative checksum approach |
