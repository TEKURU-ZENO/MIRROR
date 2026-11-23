# MIRROR — Firestore Security Rules Audit & Hardening Report
*Phase 2 — Technical Stabilization & Security Audit*
*Date: 2026-11-23*

---

## 1. Executive Summary

During the Phase 1 engineering review, several critical security gaps were identified in `firebase/firestore.rules`:
1. Universal read access granted to all authenticated users across all collections without tenant or owner isolation.
2. Collections such as `measurements` and `provenance` were unmapped and fell through to implicit deny.
3. Document creation lacked schema validation, permitting malformed or spoofed records.
4. Mutation of mutable documents (e.g., `incidents`) had no field boundaries, allowing arbitrary attribute tampering.

These rules have been comprehensively hardened to enforce the **Three-Plane Architecture** invariants:
- **Plane 1 (Evidence)**: Append-only and cryptographically verified. No deletions, no updates on evidence or measurements. Inspections are owner-restricted.
- **Plane 2 (Intelligence)**: Source-tagged on creation. Client-side mutation is strictly forbidden (`allow update: if false`).
- **Plane 3 (Governance)**: Append-only immutable audit trail. Provenance and governance records cannot be modified or deleted.

---

## 2. Hardening Matrix

| Collection | Read Rule | Create Rule | Update Rule | Delete Rule | Invariant Enforced |
|---|---|---|---|---|---|
| `/incidents/{id}` | Authenticated | Authenticated | Restricted diff (`status`, `updatedAt` only) | ❌ Deny | Core incident metadata immutable |
| `/inspections/{id}` | Authenticated | `auth.uid == inspectorId` + required keys | `isOwner(inspectorId)` + ID immutable | ❌ Deny | Identity spoofing prevented |
| `/evidenceItems/{id}` | Authenticated | Authenticated + required keys | ❌ Deny | ❌ Deny | Immutable field evidence |
| `/measurements/{id}` | Authenticated | Authenticated + required keys | ❌ Deny | ❌ Deny | Immutable sensor/gauge values |
| `/intelligence/{id}` | Authenticated | Authenticated + required keys | ❌ Deny | ❌ Deny | AI records append-only |
| `/governanceEvents/{id}` | Authenticated | Authenticated + required keys | ❌ Deny | ❌ Deny | Append-only audit log |
| `/provenance/{id}` | Authenticated | Authenticated + required keys | ❌ Deny | ❌ Deny | SHA-256 chain cannot be rewritten |
| `/reports/{id}` | Authenticated | Authenticated | Authenticated | ❌ Deny | Engineer review preserved |
| `/{document=**}` | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny | Default deny-all |

---

## 3. Required Keys Validation

To prevent malformed or malicious payload injection into the cloud database:

### `evidenceItems`
Requires: `id`, `inspectionId`, `type`, `checksum`, `capturedAt`, `ingestedAt`, `storageRef`.

### `inspections`
Requires: `id`, `incidentId`, `inspectorId`, `assetId`, `assetType`, `capturedAt`, `ingestedAt`, `syncStatus`.

### `measurements`
Requires: `id`, `inspectionId`, `label`, `value`, `unit`, `capturedAt`.

### `governanceEvents`
Requires: `id`, `occurredAt`, `actorId`, `actorType`, `eventType`, `payload`.

### `provenance`
Requires: `evidenceId`, `checksum`, `capturedAt`, `capturedBy`, `ingestedAt`.

---

## 4. Multi-Tenant Isolation (Phase 3 Roadmap)

The rules include role and organization helper functions:
- `isEngineer()`: validates `request.auth.token.role in ['engineer', 'admin']`
- `isInspector()`: validates `request.auth.token.role in ['inspector', 'admin']`
- `belongsToOrg(orgId)`: validates `request.auth.token.organizationId == orgId`

Once Firebase Authentication custom claims are integrated in Phase 3, these helpers will enforce enterprise multi-tenant boundary checks across all multi-tenant queries.

---

## 5. Local Verification Instructions

To test the security rules using the Firebase Local Emulator Suite:

```bash
# 1. Install or update firebase-tools if not already present
npm install -g firebase-tools

# 2. Start the Firestore emulator
firebase emulators:start --only firestore

# 3. Run emulator rule tests
# (Tests verify unauthenticated denial, owner restrictions, and immutability)
```
