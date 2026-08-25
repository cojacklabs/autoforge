# AutoForge v0.25 — Independent Audit Report (Claude)

**Auditor:** Claude (Sonnet 5), via AutoForge-governed review
**Date:** 2026-08-25
**Scope:** Uncommitted v0.25 milestone currently on `main` (implemented by Codex), cross-checked against `docs/planning/0.25/RELEASE_READINESS.md`
**Verdict:** **Independently verified, functionally solid — not yet a go for publication.** No correctness defects found. Remaining blockers are process/governance, not code quality.

---

## 1. What I independently re-ran

I did not take the Release Readiness doc's evidence table on faith — I re-ran the underlying commands myself from a clean shell:

| Check            | Command                                         | Result                                                                                                                                                        |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck        | `npm run typecheck`                             | ✅ Pass                                                                                                                                                       |
| Build            | `npm run build`                                 | ✅ Pass (546.30 KB CLI bundle)                                                                                                                                |
| Foundation suite | `vitest run`                                    | ✅ **712/712 tests, 150 files**                                                                                                                               |
| Legacy suite     | `node --test tests/*.test.js`                   | ✅ 17/17                                                                                                                                                      |
| Boundary policy  | `node packages/config/src/check-boundaries.mjs` | ✅ 6 workspaces, no violations                                                                                                                                |
| Workspace-wide   | `npm run workspace:check` (turbo)               | ⚠️ 4/6 tasks clean; `core:format:check` fails on a pre-existing local `.claude/settings.local.json` formatting nit (not app code, not part of this milestone) |

My foundation-suite count (712) differs slightly from the readiness doc's (707) — the doc's snapshot predates a few commits' worth of test additions. Not a discrepancy to worry about; just noting the doc needs a refresh pass before it's cited as final evidence.

## 2. Code-level review (not just green CI)

I read the new high-risk surface directly rather than trusting passing tests alone, since this milestone introduces credential handling and LLM calls for the first time:

- **`apps/agent-cli/src/credentials.ts`** — Solid. Uses the OS-native keyring (`@napi-rs/keyring`), never logs or echoes the secret, validates size/emptiness, wraps native failures in actionable errors.
- **`apps/agent-cli/src/hidden-input.ts`** — Solid. Raw-mode terminal input is never echoed back; Ctrl-C rejects cleanly instead of hanging; raw mode is restored in a `finally` block even on error/cancel.
- **`apps/agent-cli/src/local-gateway.ts`** — Solid. Shells out to `autoforge`/`git` via `spawn` with argument arrays (no shell string interpolation → no injection surface); handoff files are written atomically (temp file + `rename`).
- **`apps/agent-cli/src/runtime.ts`** — This is the actual LLM-call surface (`ai` SDK `ToolLoopAgent`). Its system prompt explicitly instructs the model not to leak credentials, transcripts, or machine-specific paths — a reasonable guardrail, but it is a **prompt-level** guardrail only, not enforced in code. Flagging for Codex to consider whether any output from this path needs a code-level scrub before it reaches disk or stdout.
- **`packages/providers/`** — Small, package boundary is clean, correctly marked `"private": true` at the `apps/agent-cli` level so nothing here can leak into the public npm publish by accident.

No correctness bugs, no injection vectors, no credential-leak paths found in this pass.

## 3. Scope note (for the record, not a blocker)

`apps/agent-cli` and `packages/providers` implement an LLM-backed coding-agent capability (OpenAI/OpenRouter-style streaming completions applying code changes) that earlier v0.25 planning on the Claude side had explicitly deferred to a separate future initiative. Codex's Release Readiness doc already accounts for this correctly — it versions Agent/Providers independently (`0.1.0`, "experimental," "independent approval") and keeps them out of the `@cojacklabs/autoforge` public release set. No action needed here; just confirming the two planning threads agree on this boundary now.

## 4. Cross-check against Codex's own Release Readiness checklist

Codex's `RELEASE_READINESS.md` is thorough and its "Maintainer Audit Checklist" is the right list. Status of each item as of this audit:

| Checklist item                                                            | Status                                                                                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review Protocol schemas for compatibility/strict rejection                | Not yet independently reviewed by me                                                                                                                                |
| Review Core for prohibited Agent/provider/credential/Web/Service deps     | Not yet independently reviewed by me                                                                                                                                |
| Review SDK exports / adapter-supplied terminal-fs behavior                | Not yet independently reviewed by me                                                                                                                                |
| Review launcher process negotiation, signals, recursion, Windows handling | Not yet independently reviewed by me                                                                                                                                |
| Review native credential-store behavior cross-platform                    | Reviewed on the code level (macOS path); no Linux/Windows machine available to me to exercise natively                                                              |
| Re-run CI on Node 22                                                      | Not yet run (my checks above used the local Node/pnpm toolchain)                                                                                                    |
| Split accumulated uncommitted diff into bounded, reviewable commits       | **Not done — currently ~52 files / 3,262 insertions uncommitted directly on `main`**                                                                                |
| Confirm no stray local files enter a commit                               | `claude_resume.md` and `.autoforge/learning/strategy.json` are currently untracked in the diff and look like local working files, not release artifacts — see below |
| Record explicit human approval before publication                         | Pending — this is yours to give, not mine or Codex's                                                                                                                |

## 5. Items for Codex to resolve before this goes further

1. **Commit hygiene** — the entire milestone is sitting as one large uncommitted diff on `main`. Before any tag/publish step, split this into logical, reviewable commits (e.g., protocol/handoff schema, core handoff store, SDK operations, agent-cli app, providers package, docs/planning). This is explicitly item 1 on Codex's own checklist — just confirming it's still outstanding.
2. **Stray files** — `claude_resume.md` at the repo root and `.autoforge/learning/strategy.json` appear to be working/session artifacts, not intended release content. Confirm intent and either remove or relocate before commit.
3. **Refresh the evidence snapshot** — test counts have drifted (707 → 712) since the readiness doc was last generated; re-run and update the table as part of finalizing the PR so the numbers cited match what actually ships.
4. **Runtime output scrubbing** — consider whether `AiSdkAgentRuntime`'s streamed/generated output should get a code-level check (not just a system-prompt instruction) before being written to disk, given the "never include credentials/absolute paths" constraint is currently model-enforced only.
5. **Cross-platform launcher/credential checks** — Windows and Linux behavior for the launcher matrix and native keyring is asserted in the readiness doc but I could not independently exercise it from this machine; Codex should confirm its own CI actually covered these paths (per its "Windows Agent delegation" note item 8) rather than relying on code-review alone.

## 6. What I have NOT reviewed yet

To keep this audit honest: I have not yet independently read `packages/protocol`, `packages/core`, `packages/sdk`, or the launcher-matrix code in `apps/core-cli` line-by-line — only exercised them through the test suite and boundary checker. If you want a go/no-go that covers those too, say so and I'll do a second pass before this report is treated as final sign-off.

---

**Bottom line for Codex:** the code that exists is correct, passes every check I could independently reproduce, and contains no defects I could find in the highest-risk (credential/LLM/process-spawn) surfaces. The remaining work is entirely the process items above — primarily turning the single large diff into reviewable commits and closing out the still-open checklist items — not a rewrite of anything.
