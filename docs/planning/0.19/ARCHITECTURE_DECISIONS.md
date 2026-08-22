# v0.19 Validation Architecture Decisions

## Mission

Make validation a deterministic, traceability-aware completion boundary for AutoForge work and releases.

## Decisions

### D-19.1 — Validation is an explicit artifact

Validation results persist as repository-native evidence linked to the work, specification, trace, and release being evaluated. Console output alone is not sufficient evidence.

### D-19.2 — Gates are typed and deterministic

Each gate declares an identifier, category, command or evaluator, severity, and pass criteria. The same inputs produce the same status and diagnostic ordering.

### D-19.3 — Quality is layered

Validation distinguishes structural checks, traceability checks, tests, security checks, and release-policy checks. A passing layer cannot conceal a failing required layer.

### D-19.4 — Failures are explainable and actionable

Every failed gate includes a stable ID, reason, affected artifact, remediation guidance, and captured evidence when available.

### D-19.5 — Readiness is policy-driven

Projects may declare required gates and severity thresholds. AutoForge evaluates policy but does not silently waive failures.

### D-19.6 — Human approval remains authoritative

AutoForge can recommend readiness and record approvals, but humans remain responsible for release decisions and accepted risk.

## Acceptance Boundary

Before v0.19 release, the implementation must provide typed gate schemas, persistent evidence, deterministic evaluation, traceability-aware diagnostics, CLI workflows, context integration, documentation, and end-to-end tests.

## Deferred

Hosted CI orchestration, probabilistic quality scoring, autonomous remediation, and organization-wide policy synchronization remain outside v0.19.
