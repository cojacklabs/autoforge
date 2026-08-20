# AutoForge 0.7.0 Phase 14 Completion Audit

**Audit date:** 2026-08-20  
**Scope:** AutoForge self-hosting and dogfood validation  
**Decision:** **PASS — AutoForge successfully dogfoods itself**

## Executive Summary

Phase 14 ran AutoForge against its own real repository rather than a temporary demonstration. The repository's legacy 0.3 installation was migrated with a full retained backup. AutoForge then created and completed five development tasks through the required sequence: persisted work, related decisions, doctrine routing, deterministic context compilation, scoped guardrails, implementation, focused validation, quality gates, and session completion.

The dogfood run found and fixed real integration problems in migration Git policy, migrated quality configuration, quality-command timeout cleanup, test concurrency, and formatter boundaries. AutoForge ends Phase 14 healthy, idle, and self-managed with five completed tasks and four retained decisions.

## Self-Hosted Workflow

```text
AutoForge task
      ↓
doctrine + decision resolver
      ↓
canonical context packet
      ↓
Codex scoped implementation
      ↓
guardrails + focused tests
      ↓
AutoForge quality gate
      ↓
completed session history
```

Every implementation edit occurred after its task was created and started. Each intended file passed the active-work, session, doctrine, context-freshness, and scope checks. A deliberate `README.md` check failed because it was outside the first task scope.

## Completed Tasks

| Task                                      | Outcome | Primary evidence                                        |
| ----------------------------------------- | ------- | ------------------------------------------------------- |
| Ignore retained migration backups         | PASS    | Precise Git policy and rollback-safe migration update   |
| Align self-hosted quality gates           | PASS    | Removed unavailable legacy ESLint gate                  |
| Terminate timed-out quality process trees | PASS    | POSIX group kill plus descendant regression test        |
| Bound foundation test concurrency         | PASS    | Four-worker Vitest limit and stable integration ceiling |
| Exclude managed state from formatting     | PASS    | Managed artifacts ignored; format gate restored         |

Final recap reports one feature, one phase, five tasks, zero issues, five completed actionable items, no active work, and no current session.

## Context Evidence

The table uses resolver estimates. Available source tokens equal selected tokens plus estimated excluded candidates for that task. Reduction is calculated from those candidate-source estimates; packet estimates include rendering overhead.

| Task               | Selected | Packet | Available | Reduction | Selected doctrines | Selected decisions |
| ------------------ | -------: | -----: | --------: | --------: | -----------------: | -----------------: |
| Backup ignore      |      399 |    583 |       751 |     46.9% |                  4 |                  1 |
| Quality gates      |      474 |    684 |       826 |     42.6% |                  4 |                  2 |
| Process trees      |      493 |    717 |       845 |     41.7% |                  4 |                  2 |
| Test concurrency   |      651 |    915 |     1,003 |     35.1% |                  4 |                  4 |
| Formatter boundary |      713 |    980 |     1,003 |     28.9% |                  5 |                  4 |

All selections remained below 6% of the 12,000-token budget. Required manual context was limited to task descriptions and four explicit decisions. No repository dump or repeated architectural explanation was supplied manually. Actual model API token consumption was not available, so the audit uses AutoForge's deterministic estimates.

## Feedback Assessment

| Feedback target     | Result             | Finding                                                                                                         |
| ------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Context size        | PASS               | Packets remained 583–980 estimated tokens                                                                       |
| Missing decisions   | PASS               | Each architectural change had a retained related decision; the formatter task reused existing decisions         |
| Bad relationships   | NOT EXERCISED      | No specifications existed, so specification relationship traversal was not part of these tasks                  |
| Doctrine usefulness | PASS WITH NOISE    | Planning, scope, testing, and router guidance were consistently useful; one weak security match was unnecessary |
| Scope rules         | PASS               | All intended files passed and deliberate `README.md` access failed                                              |
| Agent ergonomics    | PASS WITH FINDINGS | Commands were predictable; global decision listing and command failure output could be easier                   |
| Decision relevance  | PASS WITH NOISE    | Exact related decisions ranked first; low positive scores admitted unrelated prior decisions                    |
| Recovery            | PASS               | Sessions closed cleanly and timeout descendants are now terminated                                              |

## Acceptance Matrix

| Requirement                       | Result | Evidence                                                     |
| --------------------------------- | ------ | ------------------------------------------------------------ |
| Real AutoForge repository managed | PASS   | Current 0.7 installation and retained legacy backup          |
| Work persisted                    | PASS   | One feature, one phase, and five completed tasks             |
| Decisions persisted               | PASS   | Four task-linked architectural decisions                     |
| Context resolver used             | PASS   | Five generated and explained packets                         |
| Codex implementation governed     | PASS   | Scope checks before edits and bounded file changes           |
| Doctrine routing used             | PASS   | Four or five selected doctrines per session                  |
| Context freshness enforced        | PASS   | Canonical packets passed every scoped guardrail              |
| Scope enforcement used            | PASS   | In-scope pass and out-of-scope failure evidence              |
| Quality gate used                 | PASS   | Typecheck, format, 324 foundation tests, and 17 legacy tests |
| TUI reads self-hosted state       | PASS   | Healthy dashboard reports one feature and five tasks         |
| Sessions recover to idle          | PASS   | Five ended sessions and no active work                       |
| Dogfood feedback applied          | PASS   | Five concrete repository fixes implemented                   |

## Safety and Integrity

- The real migration preserved all 136 legacy files in `.autoforge.backup-be8fd8cc-0919-4581-94ae-20dc9e775d4e`.
- Git ignores the retained legacy backup, context packets, sessions, doctrine sessions, and atomic state backups.
- Git exposes current config, metadata, work, decisions, and doctrines as durable candidates.
- Every task used repository-relative include scope.
- No task edited an out-of-scope file.
- The canonical context packet was current before every implementation.
- Full tests and quality gates passed after the final task.
- No task or session remains active.

## Validation Evidence

| Gate                              | Result                                   |
| --------------------------------- | ---------------------------------------- |
| AutoForge doctor                  | PASS — current and internally consistent |
| AutoForge recap                   | PASS — idle, 5/5 tasks completed         |
| AutoForge TUI dashboard           | PASS — healthy self-hosted state         |
| Active-work guardrails            | PASS on every intended path              |
| Deliberate out-of-scope guardrail | PASS — rejected `README.md`              |
| Process-tree timeout regression   | PASS                                     |
| Strict TypeScript typecheck       | PASS                                     |
| Prettier authored-file check      | PASS                                     |
| Phase 0–14 foundation tests       | PASS — 324 tests                         |
| Retained legacy tests             | PASS — 17 tests                          |
| Total automated tests             | PASS — 341 tests                         |
| AutoForge self quality gate       | PASS — typecheck, format, tests          |
| Production ESM build              | PASS                                     |
| Production dependency audit       | PASS — 0 issues                          |
| Frozen pnpm lockfile validation   | PASS                                     |
| npm package dry-run               | PASS — 5 entries                         |
| Git whitespace validation         | PASS                                     |

## Deferred Findings

These findings do not invalidate self-hosting but should be addressed before or alongside release hardening:

1. Add golden tests for minimum decision relevance, stop words, token boundaries, and doctrine keyword precision.
2. Expose available-source totals and reduction percentage directly instead of calculating them from explanations.
3. Add a convenient global decision inventory; `why --history` currently still requires a query or work ID.
4. Surface bounded stdout/stderr from failed quality commands to improve diagnosis.
5. Exercise specification relationships during Phase 15 because self-hosting had no registered specifications.
6. Decide whether completed child tasks should roll feature and phase status forward automatically.
7. Add Windows process-tree termination beyond direct-child fallback.

## Phase 15 Entry Criteria

Virdua dogfooding may begin under these conditions:

1. Use a real design specification and relationship graph so the untested Phase 14 relationship path is covered.
2. Measure packet estimates, manual context, corrections, fidelity, and rework.
3. Preserve the same task/start/context/check/implement/test/done workflow.
4. Record resolver noise rather than silently compensating with manual context.
5. Do not weaken scope, freshness, or quality gates for the pilot.

## Sign-Off

**Engineering audit recommendation:** Proceed to Phase 15.  
**Self-hosting acceptance:** Passed.  
**Release readiness:** Not yet complete; Virdua validation, resolver findings, documentation, and versioning remain.
