# ADR-006: Non-Negotiable Human-in-the-Loop — No Autonomous Safety Certification

- **Status**: Accepted & Locked
- **Date**: 2026-11-09
- **Author**: MIRROR Architecture Team

## Context
Under state and federal engineering licensing statutes (e.g. NCEES model law, state utility commissions), certifying that a damaged high-voltage transformer, substation bus, or structural bridge is "safe to energize" or "structurally sound" carries strict criminal and civil liability. AI models cannot assume legal liability.

## Decision
- MIRROR strictly prohibits autonomous safety certifications.
- All AI assessments are classified as non-authoritative decision-support heuristics.
- Final engineering report certification requires a licensed Professional Engineer (PE) to enter their jurisdiction, license registration number (`PE-[A-Z]{2}-\d{5,6}`), review grounded citations, and execute a cryptographic digital approval token.
- Violation of this protocol is prevented by hard schema barriers in the governance plane.

## Consequences
- Legally compliant and liability-defensible engineering outputs.
- Complete regulatory acceptability for NERC-CIP and DOT compliance audits.
