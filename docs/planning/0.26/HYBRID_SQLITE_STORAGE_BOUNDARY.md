# Hybrid SQLite Storage Boundary

Status: Decision-ready benchmark; SQLite adoption deferred  
Established: 2026-08-30

## Decision

AutoForge continues to use tracked Markdown and JSON as canonical project
truth. It will not add a production SQLite dependency at the current scale.

If measured scale or concurrency later crosses the thresholds in this document,
AutoForge may introduce SQLite only as an ignored, disposable projection behind
an SDK-owned interface. Deleting the database must never delete knowledge or
prevent Core from reconstructing the same result from canonical files.

## Why the Boundary Matters

The repository's principal project-state JSON files currently occupy less than
1 MB. They remain easy to inspect, diff, move, merge, and recover with Git.
Replacing them with a database would weaken portability without solving an
observed bottleneck.

SQLite becomes useful for a different class of problem:

- repeated graph, full-text, dependency, status, or impact queries over tens of
  thousands of projected records;
- high-frequency operational events that should not rewrite tracked files;
- atomic assignment or lease coordination across multiple local processes;
- materialized views that are expensive but deterministic to rebuild.

These are acceleration and coordination concerns, not new sources of truth.

## Benchmark

The reproducible benchmark is
[`benchmarks/hybrid-storage-benchmark.mjs`](benchmarks/hybrid-storage-benchmark.mjs).
It generates a deterministic graph with two edges per node, writes and parses a
canonical JSON projection, rebuilds an indexed SQLite projection in one
transaction, and compares 200 paired status/relationship queries. It uses
`node:sqlite` only as local benchmark tooling; this does not change AutoForge's
Node 20 production support or add a runtime dependency.

Run on 2026-08-30 with Node 24.19.0, SQLite 3.53.3, and macOS x64:

|  Nodes |   Edges | JSON size | SQLite size | JSON write | JSON parse | 200 linear query pairs | SQLite rebuild | 200 indexed query pairs | Query speedup |
| -----: | ------: | --------: | ----------: | ---------: | ---------: | ---------------------: | -------------: | ----------------------: | ------------: |
|  1,000 |   2,000 |    241 KB |      336 KB |     3.8 ms |     2.6 ms |                22.7 ms |        33.0 ms |                 18.1 ms |         1.25× |
| 10,000 |  20,000 |   2.47 MB |     3.03 MB |    23.1 ms |    31.2 ms |               288.1 ms |       202.7 ms |                119.8 ms |         2.40× |
| 50,000 | 100,000 |  12.63 MB |    15.82 MB |   164.7 ms |   134.7 ms |             1,145.0 ms |     1,253.0 ms |                576.0 ms |         1.99× |

All query counts matched. Results are directional rather than universal;
hardware, SQLite version, query shape, durability settings, and filesystem
change the values. The benchmark intentionally measures rebuild cost because a
disposable index that cannot be rebuilt cheaply violates the proposed model.

At 1,000 nodes—already larger than this project's present work and decision
inventory—the absolute query difference is small, while SQLite consumes more
space and introduces schema and lifecycle complexity. The measurements do not
justify adoption for the MVP.

## Adoption Gates

Open a separate implementation issue only when production-like evidence shows
at least one of these conditions:

1. A representative repeated query has p95 latency above 100 ms or causes a
   user-visible command to exceed its agreed latency budget.
2. Rebuilding derived graph/search/status projections repeatedly consumes more
   than 500 ms during common workflows at realistic scale.
3. Canonical file writes experience measurable multi-process contention,
   conflict, or retry rates above 1% for assignment/lease operations.
4. A required full-text or graph query cannot meet its correctness and latency
   target with bounded in-memory indexes.
5. Operational event volume would create noisy or impractically large tracked
   diffs despite retention and promotion rules.

Evidence must include dataset shape, hardware/runtime, warm and cold runs,
p50/p95/p99 latency, throughput or contention rate, database size, rebuild
time, and a file-only baseline. A synthetic microbenchmark alone is not enough.

## Canonical and Projected Data

Canonical tracked files continue to own:

- intent, requirements, specifications, planning artifacts, and work graphs;
- decisions, doctrines, constitution rules, and domain knowledge;
- promoted research, learning outcomes, validation summaries, and releases;
- portable handoffs, approvals, and documented migrations.

An optional ignored SQLite projection may contain:

- full-text, graph, dependency, traceability, and impact indexes;
- materialized status and readiness views;
- bounded operational events, lease lookup data, and scheduler queues whose
  durable outcomes are promoted back into canonical records;
- source fingerprints and rebuild metadata.

Raw transcripts, credentials, provider caches, secret values, and hidden
reasoning are not authorized merely because a local database exists.

## Proposed SDK Boundary

No CLI command, agent adapter, or UI may open the database directly. A future
SDK port should expose intent rather than SQL:

```ts
interface ProjectionIndexPort {
  inspect(): Promise<{
    schemaVersion: number;
    projectionVersion: number;
    sourceFingerprint: string;
  } | null>;
  rebuild(snapshot: CanonicalProjectSnapshot): Promise<void>;
  query(request: ProjectionQuery): Promise<ProjectionResult>;
  remove(): Promise<void>;
}
```

Core operations must accept an optional port and retain a correct file-backed
fallback. Protocol contracts describe queries and results, never database paths
or SQL. This keeps alternative indexes possible and prevents SQLite details
from leaking into consumers.

## Lifecycle and Recovery Contract

A future projection must satisfy all of the following:

- Store it in the global project `cache` tier or another explicitly ignored
  local cache location, never as canonical tracked `.autoforge/` state.
- Persist `schemaVersion`, `projectionVersion`, canonical source fingerprint,
  build timestamp, and producer version.
- Rebuild on missing files, fingerprint mismatch, incompatible schema, failed
  integrity check, or canonical rollback/deletion recovery.
- Apply migrations transactionally only when lossless and cheaper than rebuild;
  otherwise delete and rebuild the projection.
- Build into a temporary database and atomically replace the active projection
  after validation so interruption cannot expose a partial index.
- Use bounded busy timeouts and explicit transactions. Enable WAL only after a
  concurrent-reader/writer benchmark demonstrates value; checkpoint and clean
  sidecar files during replacement and shutdown.
- Retain operational events for a documented bounded period and promote only
  durable outcomes to canonical files.
- Sanitize errors and never echo indexed secret-bearing source content.

## MVP Outcome

The MVP remains file-canonical with in-memory projections where useful. SQLite
is deferred, not rejected: the boundary, benchmark, adoption thresholds, SDK
ownership, and recovery rules are now explicit enough for a later issue to make
an evidence-backed implementation decision without reopening product identity
or storage authority.
