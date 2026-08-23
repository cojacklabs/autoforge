# Live Issue Fixes — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation plan

## Problem

A full triage of 9 issues filed by an external session (Virdua project, driving
AutoForge through its bootstrap/intent/workflow pipeline) found 6 already
fixed against a stale global install and 4 genuinely live defects/gaps:

1. `add-data-and-security-work-kinds-to-intent-and-workflow` — no correctly-
   labeled intent/workflow kind exists for data-modeling or security work,
   even though bootstrap's own gate list requires both.
2. `namespace-persisted-planning-artifacts-to-avoid-silent-overwrite` —
   `intent assess --artifact <kind> --persist` writes to a fixed
   `.autoforge/planning/<kind>.json` path with no source/run distinction,
   silently clobbering a prior artifact of the same kind on every write.
3. `clarify-use-command-project-lifecycle-mutation-gate` — a freshly
   registered project has `lifecycle: undefined`, which the mutation gate
   treats as blocked while `projects list`/`show` display it as `active` —
   an inconsistent, undiscoverable trap.
4. `improve-generated-user-stories-artifact-quality` — the `user-stories`
   planning artifact mechanically wraps every requirement verbatim into
   `As a user, I want <requirement>, so the stated objective is achieved`,
   producing ungrammatical, low-value boilerplate.

These four are independent (no shared code paths) and individually small;
covered here as one spec since none require cross-cutting design decisions.

## Design

### 1. Data and security work kinds

Add `data` and `security` to `READINESS_WORK_KINDS`, each mapping to a new
dedicated `WORKFLOW_KINDS` entry — `data-change` and `security-change` —
rather than aliasing to `architecture-change`. Both new workflow kinds
include an `implementation` stage (data migrations and auth/security work
genuinely produce code, unlike pure architecture decisions), giving each:

```text
research (optional) → planning (required) → implementation (required) → validation (required)
```

Update `INTENT_TO_WORKFLOW_KINDS` and `WORKFLOW_KIND_ALIASES` in
`src/core/vocabularies.ts` with the two new entries. Add matching
`WorkflowDefinition` entries in `src/workflows/definitions.ts`. Update
`workflowKind()` in `src/orchestration/context.ts` if it needs a role-based
mapping for the new kinds (audit at implementation time — current logic
only special-cases `architecture` role explicitly; `data`/`security` roles
don't exist as orchestration roles today, so this may be a no-op).

### 2. Namespace persisted planning artifacts

Change `PlanningArtifactStore`'s on-disk layout from
`.autoforge/planning/<kind>.json` to
`.autoforge/planning/<kind>/<sourceFingerprint>.json` — a clean break, no
migration path (planning artifacts are a young v0.8-era feature with no
external consumers identified in this session's audits).

- `write(artifact)` derives the fingerprint-namespaced path from
  `artifact.sourceFingerprint` and `artifact.kind`.
- `read(kind, fingerprint?)`: with a fingerprint, reads that exact artifact.
  Without one, lists all files under `.autoforge/planning/<kind>/`, and
  returns the one with the most recent `generatedAt` (or `null` if none
  exist) — preserves today's "just show me the latest" ergonomics for
  `planning show <kind>` while no longer silently destroying prior versions.
- `isFresh(kind, sourceFingerprint)` unchanged in signature/behavior —
  still checks whether an artifact matching that exact fingerprint exists
  and is the one being compared against.
- `planning list` changes from "one row per kind" to "one row per stored
  artifact, grouped by kind" — every version is now visible, not just the
  latest, making the fix's effect legible rather than just silently safer.

### 3. Clarify the `use` command lifecycle mutation gate

Two changes, both requested by the issue:

- `GlobalWorkspaceStore.registerProject()` (and the `bootstrap attach` path
  that also creates project metadata, if it constructs metadata
  independently — audit at implementation time) now sets
  `lifecycle: "active"` explicitly on first registration, instead of
  leaving the field absent. This aligns actual gate behavior with what
  `projects list`/`show` already *display* for an unset lifecycle.
- The blocked-command error message in `src/cli/index.ts` gains the exact
  fix command:
  `Project lifecycle is <value>; mutating command "<cmd>" is blocked. Run 'autoforge projects update <path> --lifecycle active' to allow mutations.`

### 4. Improve generated user-stories artifact quality

Minimal template cleanup in `src/planning/artifacts.ts`'s `user-stories`
case — no actor extraction or compound-requirement splitting (out of
scope; a real NLP problem, not a template fix):

- Stop lowercasing the entire requirement string (`.toLowerCase()` today
  mangles proper nouns/acronyms mid-sentence). Instead, lowercase only the
  first character if the requirement doesn't already start with an
  uppercase acronym pattern (heuristic: if the first word is all-caps and
  longer than one character, leave it; otherwise lowercase the first
  character only).
- Strip trailing terminal punctuation (`.`, `!`, `?`) from the requirement
  before appending the "so that" clause, avoiding doubled punctuation.
- Keep the "so that" clause but reference it once per artifact rather than
  repeating the generic phrase verbatim on every line where it adds no
  information — render it as a shared header note once, with each
  requirement rendered as a plain `As a user, I want <requirement>.` line.

## Testing

- **Data/security kinds:** `intent assess --kind data` and `--kind security`
  parse successfully; `normalizeWorkflowKind` maps `data`→`data-change` and
  `security`→`security-change`; `workflow start <id> data-change` and
  `security-change` create runs with the specified stage sequence
  (research optional, planning/implementation/validation required).
- **Planning namespacing:** writing two artifacts of the same kind with
  different fingerprints both persist to disk (no overwrite); `read(kind)`
  with no fingerprint returns the most recently generated one;
  `read(kind, fingerprint)` returns the exact match or `null`;
  `planning list` shows all stored versions grouped by kind.
- **Lifecycle gate:** a project registered via `projects register` or
  `bootstrap attach` has `lifecycle: "active"` immediately, and a mutating
  `use` command against it succeeds without a manual `--lifecycle active`
  step; the blocked-command error text contains the exact fix command when
  a project is genuinely paused/archived.
- **User-stories quality:** a requirement starting with an acronym (e.g.
  "API rate limiting must be enforced") keeps the acronym capitalized; a
  requirement ending in a period does not produce doubled punctuation; the
  generic "so the stated objective is achieved" phrase appears at most
  once in the rendered artifact, not once per requirement line.

## Rollout

Implemented as AutoForge work on itself, tracked through the normal
`autoforge add` → `autoforge start` → `autoforge done` lifecycle (now
gated on a linked decision per the documentation-gate feature shipped
earlier this session). Each of the 4 fixes closes its corresponding
pre-existing backlog issue on completion.
