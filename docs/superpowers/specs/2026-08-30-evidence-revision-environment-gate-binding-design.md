# Bind Validation Evidence to Revision, Environment, and Gate Definition — Design

**Date:** 2026-08-30
**Status:** Approved
**Origin:** `issue.bind-validation-evidence-to-revision-environment-and-gate-definition`
(v0.26 framework priority #1, per `docs/planning/0.26/AUTOFORGE_FRAMEWORK_ROADMAP.md`).

## Problem

`ValidationEvidence` records (`src/quality/evidence.ts`) carry no notion of
_when/where_ they were captured beyond a timestamp. Readiness evaluation
(`src/quality/readiness.ts`, extended in v0.25.3 to use superseding-evidence
semantics) supersedes by chronological order alone. This means evidence
captured on a stale commit, a different platform/Node/CI lane, or against a
since-changed gate definition can silently validate the current project
state — the exact "one work item can validate another" class of problem that
the v0.25.3 superseding-evidence work partially addressed, but without any
notion of revision/environment/gate-definition drift.

## Decisions

1. **Revision identity** = git HEAD SHA + working-tree dirty flag
   (`git rev-parse HEAD` + non-empty `git status --porcelain`). Cheap,
   deterministic, directly answers "was this captured against what's here
   now."
2. **Environment identity** = `{ platform, nodeMajor, ci }` — `process.platform`,
   the major version from `process.version`, and `Boolean(process.env.CI)`.
   Matches the lanes the release-readiness process already treats as
   distinct ("Node.js 22 Linux," "native Windows launcher job") without
   over-fingerprinting (exact Node patch, hostname, pnpm patch version are
   noise for this purpose).
3. **Gate-definition fingerprint** is two-tier, matching what's actually true
   about how gates are implemented:
   - Built-in gates (file-access, secret-scan, structured-syntax,
     installation, binary-files, etc.) all live in one shared
     `src/quality/service.ts` and are not independently separable — they
     share **one** fingerprint: a content hash of that file.
   - Config-driven gates (`command.<id>`, from `.autoforge/config.json`'s
     `qualityGates[]`) have no backing source file at all; each gets its
     **own** fingerprint: a content hash of its own config entry
     (`command` + `args` + `timeoutMs`).
4. **All three fields are optional** on the schema. Legacy evidence records
   (already on disk, captured before this change) parse unchanged — no
   migration, no data loss. The drift check activates only when **both**
   pieces of evidence being compared have the fields present; a legacy
   record still participates in today's chronological-supersession
   behavior unchanged.
5. **Cross-scope evidence never supersedes.** Evidence whose
   revision/environment/gate-fingerprint doesn't match the "current" scope
   is excluded from authority selection entirely for that gate — it can
   neither be chosen as authoritative nor be superseded by/supersede other
   evidence. Effectively each distinct `(revision, environment,
gateDefinitionFingerprint)` tuple gets its own authority computation.
   Older-scope evidence remains visible in raw history (`evidence list`,
   `--json`) but doesn't count toward or against current readiness.
6. **`evaluateReadiness` stays a pure function of its inputs.** "Current"
   scope is computed by the caller (the `gate`/`evidence` commands) and
   passed in explicitly as a new optional `currentScope` field on
   `EvaluateReadinessOptions`, mirroring the existing `workId` option. This
   keeps `readiness.ts` free of git/fs/process calls and easy to unit-test.
7. **Explainability is count + reason, not full detail, in default text
   output.** `evidence summary`'s human-readable line gains one clause when
   applicable (e.g. `"; 2 excluded (different revision/environment)."`).
   Full per-item detail (each excluded record's actual scope values) is
   available via `--json`, since raw evidence and `authoritativeEvidence`
   already round-trip there — no need to duplicate that detail in the
   terse default text style.

## Schema Changes

`src/quality/evidence.ts`, `validationEvidenceSchema`:

```typescript
revision: z
  .object({
    sha: z.string().trim().min(1),
    dirty: z.boolean(),
  })
  .strict()
  .optional(),
environment: z
  .object({
    platform: z.string().trim().min(1),
    nodeMajor: z.number().int().positive(),
    ci: z.boolean(),
  })
  .strict()
  .optional(),
gateDefinitionFingerprint: z.string().trim().min(1).optional(),
```

All three added to the existing `.strict()` object schema. No changes to
`validationEvidenceStoreSchema`'s `schemaVersion` — this is an additive,
backward-compatible schema change, not a breaking migration.

## Capture Site

`src/commands/gate.ts`, where `evidenceStore.record(...)` is called (the
single production call site, confirmed by codebase search): compute all
three values once per `gate check` invocation and attach them to every
recorded evidence entry.

- Revision: shell out to `git rev-parse HEAD` and `git status --porcelain`
  (empty output = clean). Both scoped to `project.path`. If git is
  unavailable or the directory isn't a git repo, omit the `revision` field
  entirely (evidence still records, just without scope binding) — do not
  fail the gate run over this.
- Environment: pure in-process — `process.platform`, parse the major
  version from `process.version`, `Boolean(process.env.CI)`.
- Gate-definition fingerprint: a small hashing helper (`node:crypto`'s
  `createHash("sha256")`) that, per check id, either hashes the contents of
  the **currently-executing script itself** (resolved via
  `fileURLToPath(import.meta.url)` from the entrypoint module, walking up
  to the actual running file — in a real npm install that's `dist/cli.js`,
  the single bundled file that actually ships; in local dev/tests it's
  whatever module is running) for built-in checks, or the specific
  `qualityGates[]` config entry's serialized `{command, args, timeoutMs}`
  (for `command.<id>` checks — strip the `command.` prefix to find the
  matching config entry by its `id`) for config-driven checks. Hashing the
  running entrypoint — rather than `src/quality/service.ts` directly —
  avoids a real bug: only `dist/cli.js` ships to npm (per `package.json`'s
  `files` field), so a source-file path assumption would silently produce
  no fingerprint (or throw) in every real installed copy of AutoForge.

## Readiness Logic Changes

`src/quality/readiness.ts`:

- `EvidenceScope` new type: `{ revision?: {...}; environment?: {...};
gateDefinitionFingerprint?: string }` — reused both as a field on
  `ValidationEvidence` (structurally) and as the shape of the new
  `currentScope` option.
- `EvaluateReadinessOptions` gains `currentScope?: EvidenceScope`.
- New helper `scopeMatches(evidenceScope, currentScope): boolean` — returns
  `true` if either side is missing enough data to compare (legacy
  fallback) or if `currentScope` itself wasn't supplied; otherwise compares
  `revision.sha`, `environment` (all three subfields), and
  `gateDefinitionFingerprint` for exact equality. Any mismatch on a
  present, comparable field ⇒ `false`.
- `projectAuthorities`/`selectAuthority`'s evidence-gathering step filters
  out evidence that fails `scopeMatches` against `currentScope` **before**
  authority selection runs, when `currentScope` is supplied. When
  `currentScope` is not supplied, behavior is fully unchanged (today's
  pure chronological supersession).
- `ReadinessReport` gains `outOfScopeCount: number` and
  `outOfScopeReasons: string[]` (short, e.g. `"evidence.tests.123:
different revision"`), populated only when `currentScope` was supplied
  and something was excluded.

## Command Surface Changes

`src/commands/gate.ts` and `src/commands/evidence.ts`: both compute
"current" scope the same way evidence is captured (git revision + process
environment + gate-definition fingerprint) and pass it as
`evaluateReadiness(evidence, { currentScope, workId })`.

`evidence summary`'s default text output appends one clause when
`outOfScopeCount > 0`:

```
Validation evidence: 4 passed, 0 failed, 1 skipped historically; 3 authoritative required result(s), 0 blocker(s); 2 excluded (different revision/environment).
```

`--json` output includes `outOfScopeCount`/`outOfScopeReasons` alongside
the existing `authoritativeEvidence`/raw evidence, unchanged in shape
otherwise.

## Testing

- Schema test: legacy evidence (missing all three new fields) still parses
  under `validationEvidenceSchema`.
- Schema test: evidence with all three new fields parses and round-trips.
- Readiness unit tests:
  - Same-scope evidence supersedes by time (existing behavior, unchanged).
  - Cross-scope evidence (different revision) does not supersede and is
    excluded from `authoritativeEvidence`, counted in `outOfScopeCount`.
  - Cross-scope evidence (different environment) — same as above.
  - Cross-scope evidence (different gate-definition fingerprint) — same as
    above.
  - Legacy evidence (missing scope fields) mixed with new-scope evidence
    still supersedes by time (fallback behavior).
  - No `currentScope` supplied ⇒ fully unchanged existing behavior
    (regression guard).
- Gate-definition fingerprint unit tests: built-in checks all get the same
  fingerprint (hash of `service.ts`); two different `command.*` config
  entries get different fingerprints; the same config entry produces a
  stable fingerprint across runs.
- Integration test: `gate check` records evidence with revision/environment/
  gateDefinitionFingerprint populated; `evidence summary` reflects
  exclusions correctly when scope changes between two recorded runs.

## Explicitly Out of Scope

- No changes to `evidence list`'s existing output shape beyond what the new
  optional fields naturally add to `--json`.
- No migration of existing on-disk evidence records — they remain valid,
  unscoped, and behave under the legacy-fallback path.
- No UI/TUI changes.
- No change to how `learning-evidence`/`src/learning/evidence-*` (a
  separate, unrelated "learning experiment evidence" concept) works — this
  issue is scoped entirely to `src/quality/evidence.ts` and
  `src/quality/readiness.ts`'s validation-gate evidence.

## Release

Targets v0.26 (first framework-priority issue from the reconciled roadmap).
No release/version decision made yet — to be determined once this and
other v0.26 work is further along.
