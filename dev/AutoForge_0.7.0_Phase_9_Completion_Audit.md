# AutoForge 0.7.0 Phase 9 Completion Audit

**Audit date:** 2026-08-20  
**Scope:** Phase 9 guardrails, recovery, refresh, and agent enforcement  
**Decision:** **PASS — approved to begin Phase 10**

## Executive Summary

Phase 9 satisfies the guardrail and enforcement objective. AutoForge now exposes one validated policy for active-work, session, doctrine, context, and file-scope checks; safely repairs unambiguous session damage; explicitly refreshes stale context; and applies enforcement at the strongest level each supported adapter can honestly provide.

The implementation fails closed, preserves the Phase 7 resolver and Phase 8 compiler as the owners of context selection and rendering, keeps mutations explicit, and does not overstate cross-agent hard-enforcement parity.

## Implemented Capability

Phase 9 now provides:

- A strict five-check `GuardrailReport` contract with complete diagnostics.
- Pure guardrail policy evaluation separated from filesystem inspection.
- No-edit-without-active-work enforcement.
- Exact active work, work-session, and doctrine-session consistency checks.
- Router-presence and active selected-doctrine enforcement.
- Canonical symlink-aware repository containment.
- Include/exclude pattern matching with exclusion precedence.
- Deterministic context currency checks against canonical and per-work packets.
- Explicit context regeneration through `autoforge check --refresh`.
- Conservative session recovery through `autoforge check --repair`.
- Advisory instructions for Codex, Cursor, Gemini/Antigravity, and Grok Build.
- Managed Claude Code project-hook installation with native edit-tool denial.
- Safe structural merging of existing Claude settings and hooks.
- CLI routing, help text, argument validation, hook input validation, and stable exit behavior.

## Acceptance Matrix

| Requirement                  | Result | Evidence                                                         |
| ---------------------------- | ------ | ---------------------------------------------------------------- |
| No edit without active work  | PASS   | `active-work` fails closed when work is absent                   |
| Scope boundaries             | PASS   | Canonical containment plus include/exclude policy                |
| Doctrine requirements        | PASS   | Current matching session, router, and active selections required |
| Session recovery             | PASS   | Missing derived state repaired only when unambiguous             |
| Context refresh              | PASS   | Exact currency detection and explicit `--refresh`                |
| Shared policy                | PASS   | CLI, adapters, and Claude hook use one evaluator                 |
| Safe hard blocking           | PASS   | Claude native edit tools deny before execution                   |
| Honest advisory enforcement  | PASS   | Other supported adapters receive advisory check instructions     |
| Existing config preservation | PASS   | Claude JSON merge retains permissions and unrelated hooks        |
| Malformed input fails closed | PASS   | Invalid CLI and hook input cannot bypass checks                  |

## Safety and Integrity

Guardrail evaluation denies when it encounters:

- No active work.
- A missing, conflicting, or mismatched work session.
- A missing or mismatched doctrine session.
- A missing router doctrine or disabled selected doctrine.
- Missing, stale, or partially published context artifacts.
- A path outside the repository, outside include scope, or inside exclude scope.
- An absent, partial, legacy, or mismatched installation.
- Malformed CLI arguments or malformed Claude hook input.

Repair refuses ambiguous state. Refresh does not change active work or session identity. Adapter setup preserves unrelated user configuration and never mutates global agent settings.

## Enforcement Boundary

Claude Code receives hard pre-execution enforcement for native `Edit`, `Write`, and `NotebookEdit` calls because their target paths are inspectable by a project `PreToolUse` hook. The hook uses exit code 2 to deny failed checks, consistent with Claude's official [hook guide](https://code.claude.com/docs/en/hooks-guide) and [hook reference](https://code.claude.com/docs/en/hooks).

This does not claim to block arbitrary filesystem mutations through Bash. Codex, Cursor, Gemini/Antigravity, and Grok Build remain advisory until they expose an equally safe pre-edit enforcement surface or AutoForge adds a lower-level repository control.

## Validation Evidence

| Gate                              | Result           |
| --------------------------------- | ---------------- |
| Strict TypeScript typecheck       | PASS             |
| Prettier check                    | PASS             |
| Production ESM build              | PASS             |
| Focused guardrail/adapter/CLI run | PASS — 77 tests  |
| Phase 0–9 foundation tests        | PASS — 279 tests |
| Retained legacy tests             | PASS — 17 tests  |
| Total automated tests             | PASS — 296 tests |
| Offline dependency audit          | PASS — 0 issues  |
| npm package dry-run               | PASS — 5 entries |
| Git whitespace validation         | PASS             |

The package dry-run used an isolated temporary npm cache because the user's default npm cache contains root-owned files. The package itself built and packed successfully.

## Architecture Assessment

The Phase 9 architecture is approved because:

- One pure policy defines authorization independently of adapter transport.
- Filesystem state and deterministic packet compilation supply policy facts without duplicating domain rules.
- Recovery is a distinct application service with conservative invariants and compensation.
- Context refresh reuses the Phase 8 compiler and store instead of adding adapter-local context logic.
- Pattern matching is centralized and repository-relative.
- Agent capability metadata determines advisory versus hard reporting.
- Claude setup structurally merges JSON and owns only its managed hook handler.
- Real bundled CLI tests verify cross-process checks, denials, refresh, and hook installation.

## Deferred, Non-Blocking Work

These items do not block Phase 10:

- Native Claude hooks do not block arbitrary Bash filesystem writes.
- Codex, Cursor, Gemini/Antigravity, and Grok Build enforcement remains advisory.
- Git hooks, filesystem sandboxes, operating-system controls, and server-side branch protection are not included.
- AutoForge does not mutate user-level or global agent configuration.
- Cross-file context publication and paired session repair are ordered and compensated but not one filesystem transaction.
- Adapter installation remains explicit rather than automatic during project initialization.
- `README.md` and package version still describe the legacy 0.6 release and remain release blockers.

## Phase 10 Entry Criteria

Phase 10 capability migration may begin under these constraints:

1. Evaluate every 0.6 capability against AutoForge's context/control-plane purpose.
2. Migrate behavior, not code, unless the existing implementation fits the 0.7 kernel boundaries.
3. Preserve the Phase 9 guardrail policy as the edit-authorization source of truth.
4. Do not add a second memory, prompt, or agent-manifest system.
5. Keep workspace boundaries, project health, and useful quality or security checks narrowly scoped.
6. Defer compliance and autonomous orchestration features that do not strengthen the kernel.
7. Add migration tests before replacing or removing retained legacy behavior.

## Sign-Off

**Engineering audit recommendation:** Proceed to Phase 10.  
**Phase 9 status:** Complete.  
**Guardrail acceptance:** Passed.  
**Release readiness:** Not yet applicable; deferred release items remain open.
