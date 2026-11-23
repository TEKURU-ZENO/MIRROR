# ADR-004: Task-Aware Hybrid AI Routing

- **Status**: Accepted & Locked
- **Date**: 2026-11-09
- **Author**: MIRROR Architecture Team

## Context
High-parameter cloud models offer superior cross-inspection synthesis but require round-trip network connectivity, incurring latency and failing when offline. Pure on-device small language models offer zero-latency local operation but lack multi-document reasoning capacity.

## Decision
Implement a task-aware hybrid inference router:
- **Local On-Device (Chrome Prompt API / Gemini Nano)**: Dispatched for field triage classification, single-photo damage tagging, and entity extraction when offline or constrained by data sovereignty policies.
- **Cloud Inference (Gemini 1.5 Pro / Flash via Firebase Cloud Functions)**: Dispatched for multi-inspection corridor correlation, cross-substation topological synthesis, and complex engineering report compilation when connected.
- Every inference payload is tagged with `inferenceSource`, `modelVersion`, `confidence`, and `durationMs`.

## Consequences
- Uninterrupted local AI reasoning even in remote mountainous utility corridors.
- High-fidelity cloud intelligence when connectivity is re-established.
