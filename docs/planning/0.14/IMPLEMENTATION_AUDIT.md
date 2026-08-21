# AutoForge v0.14 Knowledge and Context Audit

Status: implementation in progress

## Implemented

- Atomic knowledge-artifact schemas with stable IDs and provenance.
- In-memory artifact registry with typed relationships.
- Deterministic extraction from labeled unstructured input.
- Context-slice resolution from seed artifacts and relationship depth.
- Vendor-neutral `autoforge.context.v1` serialization protocol.
- CLI extraction and context resolution workflows.
- Clean and legacy project integration coverage.

## Verified

- Knowledge artifact, extraction, registry, and protocol tests pass.
- Typecheck passes.

## Remaining

- Run the full foundation and legacy suites before release preparation.
