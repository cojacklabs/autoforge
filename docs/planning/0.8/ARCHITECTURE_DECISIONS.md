# AutoForge 0.8 Architecture Decisions

These decisions are persisted in `.autoforge/state/decisions.json` and summarized here for planning review.

## D-8.1 — Intent is a durable typed artifact

Intent preserves raw user input and progressively structured fields while remaining linked to work, specifications, and research. Incomplete intent must remain visibly incomplete.

## D-8.2 — Triage is deterministic and multi-label

Triage is a pure service with repeatable rules. A request may require multiple stages, including research, clarification, architecture, design, or planning. Model calls and vendor adapters do not define classification truth.

## D-8.3 — Readiness is an explainable heuristic

Readiness output reports known evidence, missing evidence, classifications, and an optional bounded score. It never presents a heuristic score as certainty.

## D-8.4 — Research is first-class linked knowledge

Research records contain questions, sources, findings, alternatives, recommendations, confidence, and provenance. They can link to decisions and specifications and can be selected into task context.

## D-8.5 — Planning artifacts are modular projections

Feature briefs, technical plans, design briefs, user stories, and acceptance criteria are independently generated projections. AutoForge does not create one oversized planning document for every request.

## D-8.6 — v0.8 extends v0.7 additively

The released work, state, specification, resolver, adapter, and packet contracts remain compatible. New types and fields are added through existing registries and migrations; existing IDs and formats are preserved.

## Resolved Schema Contracts

1. Intent is a registry-backed specification; work stores intent references.
2. One intent may produce multiple work items through explicit relationships.
3. Triage labels are additive and conflicts are reported, not hidden by precedence.
4. Readiness uses work-kind-specific evidence profiles and reports missing fields.
5. Readiness uses a categorical level plus an optional bounded percentage.
6. Research sources carry provenance type, locator, capture time, and confidence when available.
7. `token` remains the canonical type; `design-token` is documentation terminology only.
8. Generated planning artifacts carry source fingerprints and freshness metadata.
