# AutoForge v0.14 Knowledge and Context Audit

Status: implementation complete; release preparation pending

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
- Full foundation suite passes: 88 files and 426 tests.
- Legacy suite passes: 17 tests.
- Repository formatting check passes.

## Remaining
