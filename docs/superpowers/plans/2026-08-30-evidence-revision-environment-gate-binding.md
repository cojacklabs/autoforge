# Bind Validation Evidence to Revision, Environment, and Gate Definition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional revision/environment/gate-definition-fingerprint fields to `ValidationEvidence`, so readiness evaluation can refuse to let evidence from a stale commit, a different platform/Node/CI lane, or a since-changed gate definition silently validate the current project state — while remaining fully backward compatible with existing evidence records.

**Architecture:** Additive, optional schema fields on `ValidationEvidence` (`src/quality/evidence.ts`). A new pure helper module computes "current scope" (git revision + process environment + a two-tier gate-definition fingerprint) and is called only from the command layer (`src/commands/gate.ts`, `src/commands/evidence.ts`), keeping `src/quality/readiness.ts` a pure function of its inputs — it just gains an optional `currentScope` filter applied before authority selection.

**Tech Stack:** TypeScript, Zod schemas, Vitest, `node:crypto` (`createHash`), `node:child_process` (`execFile`, matching `gate.ts`'s existing git-shelling pattern), `node:url`/`node:path` (`fileURLToPath`, matching `src/cli/index.ts`'s existing entrypoint-resolution pattern).

## Global Constraints

- Every new/changed file must pass `npx tsc --noEmit` and `npx prettier --check` before commit.
- Full suite (`npx vitest run`) must stay green after every task — no regressions in existing `quality-readiness`/`quality-evidence`/`evidence-command`/`gate-command` tests.
- All three new schema fields (`revision`, `environment`, `gateDefinitionFingerprint`) are **optional** — legacy evidence records (missing them) must continue to parse and behave exactly as they do today. Do not bump `schemaVersion`.
- `src/quality/readiness.ts`'s `evaluateReadiness` must remain a pure function of its inputs — no git/fs/process calls inside it. "Current scope" is always caller-computed and passed in via `EvaluateReadinessOptions.currentScope`.
- The built-in-gate fingerprint must hash the **currently-executing script** (resolved via `fileURLToPath(import.meta.url)`, walking to the actual running file), never a hardcoded `src/quality/service.ts` source path — only `dist/cli.js` ships to npm per `package.json`'s `files` field, so a source-path assumption would break in every real installed copy.
- Follow existing code patterns exactly: `AutoForgeError`/`EXIT_CODE` conventions, the existing git-shelling pattern in `src/commands/gate.ts`'s `readGitChangedFiles` (using `execFileAsync` with `-C <projectRoot>`), and the existing entrypoint-resolution pattern in `src/cli/index.ts`'s `findPackageVersion`.
- If git is unavailable or the directory isn't a git repository, omit the `revision` field entirely rather than failing the gate run.

---

### Task 1: Add optional revision/environment/gateDefinitionFingerprint fields to the evidence schema

**Files:**

- Modify: `src/quality/evidence.ts`
- Test: `test/quality-evidence.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `validationEvidenceSchema` gains three new optional fields. `ValidationEvidence` (the inferred type) now has:

  ```typescript
  revision?: { sha: string; dirty: boolean };
  environment?: { platform: string; nodeMajor: number; ci: boolean };
  gateDefinitionFingerprint?: string;
  ```

  Later tasks rely on these exact field names and shapes.

- [ ] **Step 1: Write the failing tests**

  Add to `test/quality-evidence.test.ts`, inside the existing `describe("validation evidence", ...)` block, after the existing test:

  ```typescript
  it("parses legacy evidence records missing the new scope fields", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-legacy-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.legacy-gate",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Legacy record with no scope fields.",
      capturedAt: "2026-08-22T00:00:00.000Z",
    });
    await expect(store.read()).resolves.toMatchObject({
      evidence: [
        {
          gateId: "tests",
          status: "passed",
          revision: undefined,
          environment: undefined,
          gateDefinitionFingerprint: undefined,
        },
      ],
    });
  });

  it("persists evidence with revision, environment, and gate-definition scope", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-scoped-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.scoped-gate",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Scoped record.",
      capturedAt: "2026-08-22T00:00:00.000Z",
      revision: { sha: "abc1234def5678", dirty: false },
      environment: { platform: "darwin", nodeMajor: 22, ci: false },
      gateDefinitionFingerprint: "fingerprint-value",
    });
    await expect(store.read()).resolves.toMatchObject({
      evidence: [
        {
          revision: { sha: "abc1234def5678", dirty: false },
          environment: { platform: "darwin", nodeMajor: 22, ci: false },
          gateDefinitionFingerprint: "fingerprint-value",
        },
      ],
    });
  });

  it("rejects a dirty flag that is not a boolean", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-invalid-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await expect(
      store.record({
        id: "evidence.invalid-gate",
        gateId: "tests",
        status: "passed",
        severity: "required",
        traceIds: [],
        reason: "Invalid record.",
        capturedAt: "2026-08-22T00:00:00.000Z",
        // @ts-expect-error - intentionally invalid for the runtime check
        revision: { sha: "abc1234", dirty: "not-a-boolean" },
      }),
    ).rejects.toThrow();
  });
  ```

  Check the top of `test/quality-evidence.test.ts` first (already read — it imports `mkdir`, `mkdtemp`, `rm` from `node:fs/promises`, `os`, `path`, `afterEach`/`describe`/`expect`/`it` from `vitest`, `initializeProject`, and `ValidationEvidenceStore`). No new imports are needed for these three tests.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run test/quality-evidence.test.ts`
  Expected: FAIL — the "persists evidence with revision..." test fails because `validationEvidenceSchema` is `.strict()` and rejects the unrecognized `revision`/`environment`/`gateDefinitionFingerprint` keys. The "rejects a dirty flag..." test may or may not fail meaningfully yet since the field doesn't exist at all (any value would currently be rejected as an unrecognized key) — that's fine, it still demonstrates a rejection, just not yet for the intended reason.

- [ ] **Step 3: Implement the schema changes**

  In `src/quality/evidence.ts`, change:

  ```typescript
  export const validationEvidenceSchema = z
    .object({
      id: z.string().regex(/^evidence\.[a-z0-9][a-z0-9._-]*$/),
      gateId: z.string().trim().min(1).max(200),
      status: z.enum(["passed", "failed", "skipped"]),
      severity: z.enum(["required", "advisory"]),
      workId: z.string().trim().min(1).max(200).optional(),
      traceIds: z.array(z.string().trim().min(1).max(200)),
      reason: z.string().trim().min(1).max(4_000),
      capturedAt: timestampSchema,
    })
    .strict();
  ```

  to:

  ```typescript
  export const validationEvidenceSchema = z
    .object({
      id: z.string().regex(/^evidence\.[a-z0-9][a-z0-9._-]*$/),
      gateId: z.string().trim().min(1).max(200),
      status: z.enum(["passed", "failed", "skipped"]),
      severity: z.enum(["required", "advisory"]),
      workId: z.string().trim().min(1).max(200).optional(),
      traceIds: z.array(z.string().trim().min(1).max(200)),
      reason: z.string().trim().min(1).max(4_000),
      capturedAt: timestampSchema,
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
    })
    .strict();
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run test/quality-evidence.test.ts`
  Expected: PASS (all 4 tests: the 1 pre-existing plus the 3 new).

- [ ] **Step 5: Run the full suite to check for regressions**

  Run: `npx vitest run`
  Expected: All existing tests still pass. Since the new fields are optional and no existing test constructs an evidence object with `.toEqual`/exact-shape assertions that would break on new optional keys (existing tests use `.toMatchObject`), no other test files should need changes. Confirm this by scanning: `grep -rln "toEqual" test/*.test.ts | xargs grep -l "gateId:\|ValidationEvidence"` — fix any that break by adding the new fields as `undefined` if needed (unlikely, but check).

- [ ] **Step 6: Typecheck and format**

  Run: `npx tsc --noEmit && npx prettier --check src/quality/evidence.ts test/quality-evidence.test.ts`
  Expected: both clean. If prettier fails, run `npx prettier --write src/quality/evidence.ts test/quality-evidence.test.ts`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/quality/evidence.ts test/quality-evidence.test.ts
  git commit -m "feat: add optional revision/environment/gate-fingerprint fields to evidence schema

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
  ```

---

### Task 2: Add scope-aware filtering to readiness evaluation

**Files:**

- Modify: `src/quality/readiness.ts`
- Test: `test/quality-readiness.test.ts`

**Interfaces:**

- Consumes: `ValidationEvidence`'s new `revision`/`environment`/`gateDefinitionFingerprint` fields from Task 1.
- Produces:
  - `EvidenceScope` new exported type: `{ revision?: { sha: string; dirty: boolean }; environment?: { platform: string; nodeMajor: number; ci: boolean }; gateDefinitionFingerprint?: string }`.
  - `EvaluateReadinessOptions` gains `currentScope?: EvidenceScope`.
  - `ReadinessReport` gains `outOfScopeCount: number` and `outOfScopeReasons: string[]`.
  - `scopeMatches(evidence: ValidationEvidence, currentScope: EvidenceScope | undefined): boolean` — new exported function (later tasks/tests may call it directly, and it's the core new logic this task adds).

- [ ] **Step 1: Write the failing tests**

  Add to `test/quality-readiness.test.ts`, after the existing last test (`"does not let narrower work evidence clear a project-wide failure"`), before the closing `});` of the `describe("quality readiness", ...)` block:

  ```typescript
  it("excludes evidence from a different revision when currentScope is supplied", () => {
    const result = evaluateReadiness(
      [
        evidence("tests-old-revision", "passed", {
          capturedAt: "2026-08-22T00:00:00.000Z",
          revision: { sha: "old-sha", dirty: false },
        }),
      ],
      {
        currentScope: { revision: { sha: "new-sha", dirty: false } },
      },
    );

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 0,
      authoritativeEvidence: [],
      outOfScopeCount: 1,
    });
    expect(result.outOfScopeReasons[0]).toContain(
      "evidence.tests-old-revision",
    );
  });

  it("excludes evidence from a different environment when currentScope is supplied", () => {
    const result = evaluateReadiness(
      [
        evidence("tests-linux", "passed", {
          capturedAt: "2026-08-22T00:00:00.000Z",
          environment: { platform: "linux", nodeMajor: 22, ci: true },
        }),
      ],
      {
        currentScope: {
          environment: { platform: "darwin", nodeMajor: 22, ci: false },
        },
      },
    );

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 0,
      outOfScopeCount: 1,
    });
  });

  it("excludes evidence from a different gate-definition fingerprint when currentScope is supplied", () => {
    const result = evaluateReadiness(
      [
        evidence("tests-old-gate", "passed", {
          capturedAt: "2026-08-22T00:00:00.000Z",
          gateDefinitionFingerprint: "old-fingerprint",
        }),
      ],
      {
        currentScope: { gateDefinitionFingerprint: "new-fingerprint" },
      },
    );

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 0,
      outOfScopeCount: 1,
    });
  });

  it("includes evidence whose full scope matches currentScope", () => {
    const scope = {
      revision: { sha: "current-sha", dirty: false },
      environment: { platform: "darwin", nodeMajor: 22, ci: false },
      gateDefinitionFingerprint: "current-fingerprint",
    };
    const result = evaluateReadiness(
      [
        evidence("tests-matching", "passed", {
          ...scope,
          capturedAt: "2026-08-22T00:00:00.000Z",
        }),
      ],
      { currentScope: scope },
    );

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 1,
      effectivePassed: 1,
      outOfScopeCount: 0,
    });
  });

  it("does not exclude legacy evidence (missing scope fields) even when currentScope is supplied", () => {
    const result = evaluateReadiness(
      [
        evidence("tests-legacy", "passed", {
          capturedAt: "2026-08-22T00:00:00.000Z",
        }),
      ],
      {
        currentScope: { revision: { sha: "current-sha", dirty: false } },
      },
    );

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 1,
      effectivePassed: 1,
      outOfScopeCount: 0,
    });
  });

  it("does not exclude anything when currentScope is not supplied, matching prior behavior", () => {
    const result = evaluateReadiness([
      evidence("tests-old-revision", "passed", {
        capturedAt: "2026-08-22T00:00:00.000Z",
        revision: { sha: "any-sha", dirty: false },
      }),
    ]);

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 1,
      effectivePassed: 1,
      outOfScopeCount: 0,
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run test/quality-readiness.test.ts`
  Expected: FAIL — `EvaluateReadinessOptions` has no `currentScope` property (TypeScript will error at the call sites once you run `tsc`, but at the `vitest run` level the tests will fail because `result.outOfScopeCount` is `undefined`, not the expected number, and the excluded evidence isn't actually excluded from `authoritativeEvidence`/`effectiveTotal` yet).

- [ ] **Step 3: Implement scope-aware filtering**

  In `src/quality/readiness.ts`, add near the top (after the `AuthoritativeEvidence` interface, before `ReadinessReport`):

  ```typescript
  export interface EvidenceScope {
    revision?: { sha: string; dirty: boolean };
    environment?: { platform: string; nodeMajor: number; ci: boolean };
    gateDefinitionFingerprint?: string;
  }
  ```

  Update `ReadinessReport` to add the two new fields:

  ```typescript
  export interface ReadinessReport {
    ready: boolean;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    effectiveTotal: number;
    effectivePassed: number;
    effectiveFailed: number;
    effectiveSkipped: number;
    blockers: string[];
    authoritativeEvidence: AuthoritativeEvidence[];
    outOfScopeCount: number;
    outOfScopeReasons: string[];
  }
  ```

  Update `EvaluateReadinessOptions`:

  ```typescript
  export interface EvaluateReadinessOptions {
    workId?: string;
    currentScope?: EvidenceScope;
  }
  ```

  Add a new exported function, right after `isConclusive`:

  ```typescript
  function scopeMismatchReason(
    evidence: ValidationEvidence,
    currentScope: EvidenceScope,
  ): string | undefined {
    if (
      evidence.revision &&
      currentScope.revision &&
      evidence.revision.sha !== currentScope.revision.sha
    ) {
      return "different revision";
    }
    if (evidence.environment && currentScope.environment) {
      const { platform, nodeMajor, ci } = evidence.environment;
      const current = currentScope.environment;
      if (
        platform !== current.platform ||
        nodeMajor !== current.nodeMajor ||
        ci !== current.ci
      ) {
        return "different environment";
      }
    }
    if (
      evidence.gateDefinitionFingerprint &&
      currentScope.gateDefinitionFingerprint &&
      evidence.gateDefinitionFingerprint !==
        currentScope.gateDefinitionFingerprint
    ) {
      return "different gate definition";
    }
    return undefined;
  }

  export function scopeMatches(
    evidence: ValidationEvidence,
    currentScope: EvidenceScope | undefined,
  ): boolean {
    if (!currentScope) return true;
    return scopeMismatchReason(evidence, currentScope) === undefined;
  }
  ```

  Now update `evaluateReadiness` to filter by scope before computing authorities, and to populate the two new report fields. Replace the current body:

  ```typescript
  export function evaluateReadiness(
    evidence: readonly ValidationEvidence[],
    options: EvaluateReadinessOptions = {},
  ): ReadinessReport {
    const requiredEvidence = evidence.filter(
      (item) => item.severity === "required",
    );
    const authoritativeEvidence = (
      options.workId
        ? projectAuthorities(
            requiredEvidence.filter(
              (item) =>
                item.workId === undefined || item.workId === options.workId,
            ),
          )
        : projectAuthorities(requiredEvidence)
    ).sort(
      (left, right) =>
        left.gateId.localeCompare(right.gateId) ||
        (left.workId ?? "").localeCompare(right.workId ?? "") ||
        left.evidenceId.localeCompare(right.evidenceId),
    );
    const failedAuthorities = authoritativeEvidence.filter(
      (item) => item.status === "failed",
    );
    const blockers = failedAuthorities
      .map(
        (item) =>
          `${item.gateId}${item.workId ? ` [${item.workId}]` : ""}: ${item.reason}`,
      )
      .sort((left, right) => left.localeCompare(right));
    const failed = evidence.filter((item) => item.status === "failed");
    return {
      ready: blockers.length === 0,
      total: evidence.length,
      passed: evidence.filter((item) => item.status === "passed").length,
      failed: failed.length,
      skipped: evidence.filter((item) => item.status === "skipped").length,
      effectiveTotal: authoritativeEvidence.length,
      effectivePassed: authoritativeEvidence.filter(
        (item) => item.status === "passed",
      ).length,
      effectiveFailed: failedAuthorities.length,
      effectiveSkipped: authoritativeEvidence.filter(
        (item) => item.status === "skipped",
      ).length,
      blockers,
      authoritativeEvidence,
    };
  }
  ```

  with:

  ```typescript
  export function evaluateReadiness(
    evidence: readonly ValidationEvidence[],
    options: EvaluateReadinessOptions = {},
  ): ReadinessReport {
    const requiredEvidence = evidence.filter(
      (item) => item.severity === "required",
    );
    const inScope: ValidationEvidence[] = [];
    const outOfScopeReasons: string[] = [];
    for (const item of requiredEvidence) {
      const reason = options.currentScope
        ? scopeMismatchReason(item, options.currentScope)
        : undefined;
      if (reason) {
        outOfScopeReasons.push(`${item.id}: ${reason}`);
      } else {
        inScope.push(item);
      }
    }
    outOfScopeReasons.sort((left, right) => left.localeCompare(right));
    const authoritativeEvidence = (
      options.workId
        ? projectAuthorities(
            inScope.filter(
              (item) =>
                item.workId === undefined || item.workId === options.workId,
            ),
          )
        : projectAuthorities(inScope)
    ).sort(
      (left, right) =>
        left.gateId.localeCompare(right.gateId) ||
        (left.workId ?? "").localeCompare(right.workId ?? "") ||
        left.evidenceId.localeCompare(right.evidenceId),
    );
    const failedAuthorities = authoritativeEvidence.filter(
      (item) => item.status === "failed",
    );
    const blockers = failedAuthorities
      .map(
        (item) =>
          `${item.gateId}${item.workId ? ` [${item.workId}]` : ""}: ${item.reason}`,
      )
      .sort((left, right) => left.localeCompare(right));
    const failed = evidence.filter((item) => item.status === "failed");
    return {
      ready: blockers.length === 0,
      total: evidence.length,
      passed: evidence.filter((item) => item.status === "passed").length,
      failed: failed.length,
      skipped: evidence.filter((item) => item.status === "skipped").length,
      effectiveTotal: authoritativeEvidence.length,
      effectivePassed: authoritativeEvidence.filter(
        (item) => item.status === "passed",
      ).length,
      effectiveFailed: failedAuthorities.length,
      effectiveSkipped: authoritativeEvidence.filter(
        (item) => item.status === "skipped",
      ).length,
      blockers,
      authoritativeEvidence,
      outOfScopeCount: outOfScopeReasons.length,
      outOfScopeReasons,
    };
  }
  ```

  Note: the filtering happens on `requiredEvidence` (before `projectAuthorities` groups by gate/work), so `total`/`passed`/`failed`/`skipped` (computed from the raw, unfiltered `evidence` array) are unaffected by scope — those remain historical totals exactly as documented in the design ("Older-scope evidence remains visible in raw history"). Only `effectiveTotal`/`effectivePassed`/`effectiveFailed`/`effectiveSkipped`/`authoritativeEvidence`/`blockers` are computed from the scope-filtered set.

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run test/quality-readiness.test.ts`
  Expected: PASS (all tests, including the 6 new ones).

- [ ] **Step 5: Run the full suite to check for regressions**

  Run: `npx vitest run`
  Expected: All existing tests pass — no other file constructs a `ReadinessReport` object with an exact-shape assertion that would break on the two new fields (checked: `test/evidence-command.test.ts` uses `.toMatchObject`, not `.toEqual`, on the summary object). Confirm with: `grep -rn "toEqual.*ready:\|toEqual.*effectiveTotal" test/*.test.ts` — fix any hits.

- [ ] **Step 6: Typecheck and format**

  Run: `npx tsc --noEmit && npx prettier --check src/quality/readiness.ts test/quality-readiness.test.ts`
  Expected: clean. Fix with `npx prettier --write src/quality/readiness.ts test/quality-readiness.test.ts` if needed.

- [ ] **Step 7: Commit**

  ```bash
  git add src/quality/readiness.ts test/quality-readiness.test.ts
  git commit -m "feat: exclude out-of-scope evidence from readiness authority selection

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
  ```

---

### Task 3: Add a scope-computation helper module

**Files:**

- Create: `src/quality/scope.ts`
- Test: `test/quality-scope.test.ts`

**Interfaces:**

- Consumes: `QualityGateCommand` type from `src/core/config.js` (already exported — confirmed via `export type QualityGateCommand = z.infer<typeof qualityGateCommandSchema>;` in `src/core/config.ts:67`).
- Produces:
  - `export async function computeCurrentRevision(projectRoot: string): Promise<{ sha: string; dirty: boolean } | undefined>`
  - `export function computeCurrentEnvironment(): { platform: string; nodeMajor: number; ci: boolean }`
  - `export async function computeGateDefinitionFingerprint(checkId: string, options: { qualityGates: readonly QualityGateCommand[]; entrypointUrl?: string }): Promise<string>`

  These three functions are consumed by Task 4 (`src/commands/gate.ts`) and Task 5 (`src/commands/evidence.ts`) to compute `EvidenceScope` values passed into evidence recording and `evaluateReadiness`.

- [ ] **Step 1: Write the failing tests**

  Create `test/quality-scope.test.ts`:

  ```typescript
  import { execFile } from "node:child_process";
  import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
  import os from "node:os";
  import path from "node:path";
  import { promisify } from "node:util";
  import { pathToFileURL } from "node:url";

  import { afterEach, describe, expect, it } from "vitest";

  import {
    computeCurrentEnvironment,
    computeCurrentRevision,
    computeGateDefinitionFingerprint,
  } from "../src/quality/scope.js";

  const execFileAsync = promisify(execFile);
  const roots: string[] = [];

  afterEach(async () =>
    Promise.all(
      roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    ),
  );

  async function createGitProject(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "autoforge-scope-"));
    roots.push(root);
    await execFileAsync("git", ["-C", root, "init", "-q"]);
    await execFileAsync("git", [
      "-C",
      root,
      "config",
      "user.email",
      "test@example.com",
    ]);
    await execFileAsync("git", ["-C", root, "config", "user.name", "Test"]);
    await writeFile(path.join(root, "README.md"), "test\n");
    await execFileAsync("git", ["-C", root, "add", "."]);
    await execFileAsync("git", ["-C", root, "commit", "-q", "-m", "initial"]);
    return root;
  }

  describe("computeCurrentRevision", () => {
    it("returns the current HEAD sha and dirty=false on a clean tree", async () => {
      const root = await createGitProject();
      const { stdout } = await execFileAsync("git", [
        "-C",
        root,
        "rev-parse",
        "HEAD",
      ]);
      const result = await computeCurrentRevision(root);
      expect(result).toEqual({ sha: stdout.trim(), dirty: false });
    });

    it("returns dirty=true when the working tree has uncommitted changes", async () => {
      const root = await createGitProject();
      await writeFile(path.join(root, "README.md"), "changed\n");
      const result = await computeCurrentRevision(root);
      expect(result?.dirty).toBe(true);
    });

    it("returns undefined when the directory is not a git repository", async () => {
      const root = await mkdtemp(
        path.join(os.tmpdir(), "autoforge-scope-nogit-"),
      );
      roots.push(root);
      const result = await computeCurrentRevision(root);
      expect(result).toBeUndefined();
    });
  });

  describe("computeCurrentEnvironment", () => {
    it("returns the running platform, Node major version, and CI flag", () => {
      const result = computeCurrentEnvironment();
      expect(result.platform).toBe(process.platform);
      expect(result.nodeMajor).toBe(
        Number(process.version.replace(/^v/, "").split(".")[0]),
      );
      expect(typeof result.ci).toBe("boolean");
    });
  });

  describe("computeGateDefinitionFingerprint", () => {
    it("returns a stable fingerprint for a built-in check based on the running entrypoint", async () => {
      const entrypointUrl = pathToFileURL(
        path.join(process.cwd(), "test", "quality-scope.test.ts"),
      ).href;
      const first = await computeGateDefinitionFingerprint("file-access", {
        qualityGates: [],
        entrypointUrl,
      });
      const second = await computeGateDefinitionFingerprint("file-access", {
        qualityGates: [],
        entrypointUrl,
      });
      expect(first).toBe(second);
      expect(first.length).toBeGreaterThan(0);
    });

    it("returns different fingerprints for different config entries of a command.* check", async () => {
      const entrypointUrl = pathToFileURL(
        path.join(process.cwd(), "test", "quality-scope.test.ts"),
      ).href;
      const first = await computeGateDefinitionFingerprint("command.test", {
        qualityGates: [
          { id: "test", command: "pnpm", args: ["test"], timeoutMs: 120_000 },
        ],
        entrypointUrl,
      });
      const second = await computeGateDefinitionFingerprint("command.test", {
        qualityGates: [
          { id: "test", command: "npm", args: ["test"], timeoutMs: 120_000 },
        ],
        entrypointUrl,
      });
      expect(first).not.toBe(second);
    });

    it("returns a stable fingerprint for the same command.* config entry", async () => {
      const entrypointUrl = pathToFileURL(
        path.join(process.cwd(), "test", "quality-scope.test.ts"),
      ).href;
      const gates = [
        { id: "test", command: "pnpm", args: ["test"], timeoutMs: 120_000 },
      ];
      const first = await computeGateDefinitionFingerprint("command.test", {
        qualityGates: gates,
        entrypointUrl,
      });
      const second = await computeGateDefinitionFingerprint("command.test", {
        qualityGates: gates,
        entrypointUrl,
      });
      expect(first).toBe(second);
    });

    it("shares one fingerprint across different built-in check ids", async () => {
      const entrypointUrl = pathToFileURL(
        path.join(process.cwd(), "test", "quality-scope.test.ts"),
      ).href;
      const fileAccess = await computeGateDefinitionFingerprint("file-access", {
        qualityGates: [],
        entrypointUrl,
      });
      const secretScan = await computeGateDefinitionFingerprint("secret-scan", {
        qualityGates: [],
        entrypointUrl,
      });
      expect(fileAccess).toBe(secretScan);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npx vitest run test/quality-scope.test.ts`
  Expected: FAIL — `../src/quality/scope.js` does not exist.

- [ ] **Step 3: Implement `src/quality/scope.ts`**

  ```typescript
  import { execFile } from "node:child_process";
  import { createHash } from "node:crypto";
  import { readFile } from "node:fs/promises";
  import { fileURLToPath } from "node:url";
  import { promisify } from "node:util";

  import type { QualityGateCommand } from "../core/config.js";

  const execFileAsync = promisify(execFile);

  export async function computeCurrentRevision(
    projectRoot: string,
  ): Promise<{ sha: string; dirty: boolean } | undefined> {
    try {
      const { stdout: sha } = await execFileAsync("git", [
        "-C",
        projectRoot,
        "rev-parse",
        "HEAD",
      ]);
      const { stdout: status } = await execFileAsync("git", [
        "-C",
        projectRoot,
        "status",
        "--porcelain",
      ]);
      return { sha: sha.trim(), dirty: status.trim().length > 0 };
    } catch {
      return undefined;
    }
  }

  export function computeCurrentEnvironment(): {
    platform: string;
    nodeMajor: number;
    ci: boolean;
  } {
    const nodeMajor = Number(process.version.replace(/^v/, "").split(".")[0]);
    return {
      platform: process.platform,
      nodeMajor,
      ci: Boolean(process.env.CI),
    };
  }

  export interface GateDefinitionFingerprintOptions {
    qualityGates: readonly QualityGateCommand[];
    entrypointUrl?: string;
  }

  export async function computeGateDefinitionFingerprint(
    checkId: string,
    options: GateDefinitionFingerprintOptions,
  ): Promise<string> {
    if (checkId.startsWith("command.")) {
      const commandId = checkId.slice("command.".length);
      const entry = options.qualityGates.find((gate) => gate.id === commandId);
      const payload = entry
        ? JSON.stringify({
            command: entry.command,
            args: entry.args,
            timeoutMs: entry.timeoutMs,
          })
        : `missing:${commandId}`;
      return createHash("sha256").update(payload).digest("hex");
    }
    const entrypointUrl = options.entrypointUrl ?? import.meta.url;
    const entrypointPath = fileURLToPath(entrypointUrl);
    const contents = await readFile(entrypointPath);
    return createHash("sha256").update(contents).digest("hex");
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npx vitest run test/quality-scope.test.ts`
  Expected: PASS (all tests).

- [ ] **Step 5: Run the full suite to check for regressions**

  Run: `npx vitest run`
  Expected: All existing tests pass — this task only adds a new file, no existing files are modified.

- [ ] **Step 6: Typecheck and format**

  Run: `npx tsc --noEmit && npx prettier --check src/quality/scope.ts test/quality-scope.test.ts`
  Expected: clean. Fix with `npx prettier --write src/quality/scope.ts test/quality-scope.test.ts` if needed.

- [ ] **Step 7: Commit**

  ```bash
  git add src/quality/scope.ts test/quality-scope.test.ts
  git commit -m "feat: add scope-computation helpers for evidence revision/environment/gate-fingerprint

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
  ```

---

### Task 4: Wire scope capture into `autoforge gate check`

**Files:**

- Modify: `src/commands/gate.ts`
- Test: `test/gate-command.test.ts` (confirmed to already exist — this is the
  right home for this test, since it already exercises `runGateCommand` +
  `ValidationEvidenceStore` together).

**Interfaces:**

- Consumes: `computeCurrentRevision`, `computeCurrentEnvironment`, `computeGateDefinitionFingerprint` from `src/quality/scope.js` (Task 3); `inspectInstallation` from `src/commands/init.js` (already used elsewhere in the codebase, e.g. `src/commands/contract.ts`, exposing `.config?.qualityGates`).
- Produces: every evidence record written by `gate check` now includes `revision`, `environment`, and `gateDefinitionFingerprint` (when computable).

- [ ] **Step 1: Read the existing fixture in `test/gate-command.test.ts`**

  Read the file's top section (already confirmed to contain a
  `createProject()` helper using `mkdir(path.join(projectRoot, ".git"))` —
  a bare directory, not a real git repository). This new test needs a
  **real** git repository with at least one commit (so
  `computeCurrentRevision` returns an actual 40-character SHA rather than
  `undefined`), so it cannot reuse `createProject()` as-is. Add a small
  local helper in this new test (or alongside it) rather than modifying
  the shared `createProject()`, to avoid changing behavior for the file's
  other existing tests.

- [ ] **Step 2: Write the failing test**

  Add to `test/gate-command.test.ts`, as a new top-level `describe` block.
  Add `import { execFile } from "node:child_process"; import { promisify } from "node:util";`
  and `const execFileAsync = promisify(execFile);` near the top of the file
  (merge into the existing import block rather than duplicating any
  existing import):

  ```typescript
  describe("gate check evidence scope", () => {
    it("records revision, environment, and gate-definition scope on captured evidence", async () => {
      const root = await mkdtemp(
        path.join(os.tmpdir(), "autoforge-gate-scope-"),
      );
      temporaryDirectories.push(root);
      await execFileAsync("git", ["-C", root, "init", "-q"]);
      await execFileAsync("git", [
        "-C",
        root,
        "config",
        "user.email",
        "test@example.com",
      ]);
      await execFileAsync("git", ["-C", root, "config", "user.name", "Test"]);
      await initializeProject({ projectRoot: root, projectId: PROJECT_ID });
      await execFileAsync("git", ["-C", root, "add", "."]);
      await execFileAsync("git", ["-C", root, "commit", "-q", "-m", "initial"]);

      await runGateCommand({
        args: ["check"],
        output: { stdout: vi.fn(), stderr: vi.fn() },
        startDirectory: root,
        changedFileReader: async () => [],
      });

      const { state } = await new ValidationEvidenceStore(root).read();
      expect(state.evidence.length).toBeGreaterThan(0);
      for (const item of state.evidence) {
        expect(item.revision).toMatchObject({ dirty: false });
        expect(item.revision?.sha).toMatch(/^[0-9a-f]{40}$/);
        expect(item.environment).toMatchObject({
          platform: process.platform,
        });
        expect(item.gateDefinitionFingerprint).toBeTruthy();
      }
    });
  });
  ```

  This reuses the file's existing `temporaryDirectories` array (confirmed
  present in `test/gate-command.test.ts`'s top section) rather than a
  `roots` array, and the existing `PROJECT_ID` constant already defined in
  that file.

  `test/gate-command.test.ts` already imports `runGateCommand`, `vi`,
  `ValidationEvidenceStore`, `mkdir`, `mkdtemp`, `path`, `os` — only the
  `execFile`/`promisify` import and `execFileAsync` constant above are new
  to this file; add them to the existing import block rather than
  duplicating anything already present.

- [ ] **Step 3: Run the test to verify it fails**

  Run: `npx vitest run test/gate-command.test.ts`
  Expected: FAIL — recorded evidence has no `revision`/`environment`/`gateDefinitionFingerprint` fields yet.

- [ ] **Step 4: Implement the wiring in `src/commands/gate.ts`**

  Add imports at the top of `src/commands/gate.ts`:

  ```typescript
  import { inspectInstallation } from "./init.js";
  import {
    computeCurrentEnvironment,
    computeCurrentRevision,
    computeGateDefinitionFingerprint,
  } from "../quality/scope.js";
  ```

  In `runGateCommand`, after `const workState = (await createWorkStateStore(project.path).read()).state.data;` and before `const files = await selectGateFiles(...)`, add:

  ```typescript
  const inspection = await inspectInstallation(project.path);
  const qualityGates = inspection.config?.qualityGates ?? [];
  const [revision, environment] = await Promise.all([
    computeCurrentRevision(project.path),
    Promise.resolve(computeCurrentEnvironment()),
  ]);
  ```

  Then update the evidence-recording loop. Replace:

  ```typescript
  const evidenceStore = new ValidationEvidenceStore(project.path);
  const capturedAt = new Date().toISOString();
  const activeWorkId = workState.activeWork?.id;
  for (const check of report.checks) {
    await evidenceStore.record({
      id: `evidence.${check.id}.${Date.now()}`,
      gateId: check.id,
      status:
        check.status === "pass"
          ? "passed"
          : check.status === "skipped"
            ? "skipped"
            : "failed",
      severity: check.status === "warning" ? "advisory" : "required",
      ...(activeWorkId ? { workId: activeWorkId } : {}),
      traceIds: [],
      reason: check.message,
      capturedAt,
    });
  }
  ```

  with:

  ```typescript
  const evidenceStore = new ValidationEvidenceStore(project.path);
  const capturedAt = new Date().toISOString();
  const activeWorkId = workState.activeWork?.id;
  for (const check of report.checks) {
    const gateDefinitionFingerprint = await computeGateDefinitionFingerprint(
      check.id,
      { qualityGates },
    );
    await evidenceStore.record({
      id: `evidence.${check.id}.${Date.now()}`,
      gateId: check.id,
      status:
        check.status === "pass"
          ? "passed"
          : check.status === "skipped"
            ? "skipped"
            : "failed",
      severity: check.status === "warning" ? "advisory" : "required",
      ...(activeWorkId ? { workId: activeWorkId } : {}),
      traceIds: [],
      reason: check.message,
      capturedAt,
      ...(revision ? { revision } : {}),
      environment,
      gateDefinitionFingerprint,
    });
  }
  ```

- [ ] **Step 5: Run the test to verify it passes**

  Run: `npx vitest run test/gate-command.test.ts`
  Expected: PASS.

- [ ] **Step 6: Run the full suite to check for regressions**

  Run: `npx vitest run`
  Expected: All existing tests pass. `test/evidence-command.test.ts`'s two existing tests call `ValidationEvidenceStore.record()` directly (not through `gate check`), so they're unaffected by this change — confirm this holds by re-reading `test/evidence-command.test.ts` if any failure surfaces there.

- [ ] **Step 7: Typecheck and format**

  Run: `npx tsc --noEmit && npx prettier --check src/commands/gate.ts test/gate-command.test.ts`
  Expected: clean. Fix with `npx prettier --write src/commands/gate.ts test/gate-command.test.ts` if needed.

- [ ] **Step 8: Commit**

  ```bash
  git add src/commands/gate.ts test/gate-command.test.ts
  git commit -m "feat: capture revision/environment/gate-fingerprint scope on gate check evidence

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
  ```

---

### Task 5: Wire scope filtering into `autoforge evidence summary`

**Files:**

- Modify: `src/commands/evidence.ts`
- Test: `test/evidence-command.test.ts`

**Interfaces:**

- Consumes: `computeCurrentRevision`, `computeCurrentEnvironment` from `src/quality/scope.js` (Task 3); `evaluateReadiness`'s new `currentScope` option and `outOfScopeCount`/`outOfScopeReasons` fields (Task 2); `inspectInstallation` (for `qualityGates`, needed if the summary command wants a fingerprint — see note below).
- Produces: `evidence summary`'s text output gains an `"; N excluded (...)"` clause when `outOfScopeCount > 0`; `--json` output includes `outOfScopeCount`/`outOfScopeReasons`.

**Reconciled design note on gate applicability:** `evidence summary` computes a
current fingerprint for every built-in and configured command gate, then passes
the resulting gate-id-to-fingerprint map into readiness evaluation. This avoids
the invalid single-fingerprint comparison while ensuring a changed gate cannot
retain authority. The evaluator also receives the complete expected gate-id set,
so excluding all evidence—or omitting one required gate—produces an explicit
blocker instead of a vacuous ready state. When a current scope is available,
legacy records lacking its revision, environment, or gate-definition fields stay
readable as history but are not authoritative. Dirty revisions include a content
fingerprint so two different working trees at the same HEAD cannot share
authority.

- [ ] **Step 1: Write the failing test**

  Add to `test/evidence-command.test.ts`, after the existing two tests, inside `describe("evidence command", ...)`:

  ```typescript
  it("excludes out-of-scope evidence from the summary and reports the count", async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-evidence-command-scope-"),
    );
    roots.push(root);
    await mkdir(path.join(root, ".git"));
    await initializeProject({ projectRoot: root });
    const store = new ValidationEvidenceStore(root);
    await store.record({
      id: "evidence.tests.old-revision",
      gateId: "tests",
      status: "passed",
      severity: "required",
      traceIds: [],
      reason: "Old revision result.",
      capturedAt: "2026-08-22T00:00:00.000Z",
      revision: { sha: "definitely-not-current-sha", dirty: false },
    });
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runEvidenceCommand({
        args: ["summary", "--json"],
        output,
        startDirectory: root,
      }),
    ).resolves.toBe(0);
    const summary = JSON.parse(output.stdout.mock.calls[0]?.[0] ?? "");
    expect(summary.outOfScopeCount).toBe(1);
    expect(summary.outOfScopeReasons[0]).toContain(
      "evidence.tests.old-revision",
    );
    expect(summary.effectiveTotal).toBe(0);
  });
  ```

  This test relies on the real `computeCurrentRevision` returning a HEAD sha for `root` that will never equal `"definitely-not-current-sha"` — no mocking needed, since any real git repo's actual HEAD sha differs from that literal string.

- [ ] **Step 2: Run the test to verify it fails**

  Run: `npx vitest run test/evidence-command.test.ts`
  Expected: FAIL — `summary.outOfScopeCount` is `undefined` since `runEvidenceCommand` doesn't pass `currentScope` to `evaluateReadiness` yet.

- [ ] **Step 3: Implement the wiring in `src/commands/evidence.ts`**

  Replace the full file with:

  ```typescript
  import { EXIT_CODE, type ExitCode } from "../core/errors.js";
  import type { LogWriter } from "../core/logger.js";
  import { ValidationEvidenceStore } from "../quality/evidence.js";
  import { evaluateReadiness } from "../quality/readiness.js";
  import {
    computeCurrentEnvironment,
    computeCurrentRevision,
  } from "../quality/scope.js";

  export interface EvidenceCommandOptions {
    args: readonly string[];
    output: LogWriter;
    startDirectory: string;
  }

  function usage(output: LogWriter): ExitCode {
    output.stderr(
      "Usage: autoforge evidence list [--json] | evidence summary [--json]",
    );
    return EXIT_CODE.usage;
  }

  export async function runEvidenceCommand(
    options: EvidenceCommandOptions,
  ): Promise<ExitCode> {
    const [action, flag] = options.args;
    if (!action || (flag !== undefined && flag !== "--json"))
      return usage(options.output);
    const json = flag === "--json";
    const state = await new ValidationEvidenceStore(
      options.startDirectory,
    ).read();
    if (action === "list") {
      if (json) options.output.stdout(JSON.stringify(state, null, 2));
      else
        options.output.stdout(
          state.evidence.length === 0
            ? "Validation evidence: 0"
            : state.evidence
                .map(
                  (evidence) =>
                    `${evidence.id}: ${evidence.status} (${evidence.gateId})`,
                )
                .join("\n"),
        );
      return EXIT_CODE.success;
    }
    if (action === "summary") {
      const revision = await computeCurrentRevision(options.startDirectory);
      const environment = computeCurrentEnvironment();
      const readiness = evaluateReadiness(state.evidence, {
        currentScope: { revision, environment },
      });
      const summary = {
        ...readiness,
        requiredFailures: readiness.blockers.length,
      };
      if (json) options.output.stdout(JSON.stringify(summary, null, 2));
      else {
        const outOfScopeClause =
          summary.outOfScopeCount > 0
            ? `; ${summary.outOfScopeCount} excluded (different revision/environment)`
            : "";
        options.output.stdout(
          `Validation evidence: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped historically; ${summary.effectiveTotal} authoritative required result(s), ${summary.requiredFailures} blocker(s)${outOfScopeClause}.`,
        );
      }
      return readiness.ready ? EXIT_CODE.success : EXIT_CODE.invalidState;
    }
    return usage(options.output);
  }
  ```

- [ ] **Step 4: Run the test to verify it passes**

  Run: `npx vitest run test/evidence-command.test.ts`
  Expected: PASS (all 3 tests: the 2 pre-existing plus the 1 new).

- [ ] **Step 5: Run the full suite to check for regressions**

  Run: `npx vitest run`
  Expected: All existing tests pass. Command tests must seed applicable evidence
  for every required built-in gate. When a repository has no resolvable HEAD,
  revision comparison is unavailable, but environment and per-gate definition
  applicability still apply.

- [ ] **Step 6: Typecheck and format**

  Run: `npx tsc --noEmit && npx prettier --check src/commands/evidence.ts test/evidence-command.test.ts`
  Expected: clean. Fix with `npx prettier --write src/commands/evidence.ts test/evidence-command.test.ts` if needed.

- [ ] **Step 7: Commit**

  ```bash
  git add src/commands/evidence.ts test/evidence-command.test.ts
  git commit -m "feat: filter evidence summary by current revision/environment scope

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
  ```

---

### Task 6: Update CHANGELOG and final verification

**Files:**

- Modify: `CHANGELOG.md`

**Interfaces:** none.

- [ ] **Step 1: Check current CHANGELOG state**

  Run: `sed -n '1,15p' CHANGELOG.md`

  Confirm whether a version section already exists for unreleased work, or whether a new `## [Unreleased]`-style heading is needed. If the top of the file has diverged from what's described here (e.g. a new version has already shipped since this plan was written), stop and ask the user which section this should land under rather than guessing.

- [ ] **Step 2: Add a changelog entry**

  Add a new entry (exact placement depends on Step 1's finding) with:

  ```markdown
  ### Added

  - Validation evidence now optionally records the source revision (git HEAD
    SHA + working-tree dirty flag), execution environment (platform, Node
    major version, CI flag), and a gate-definition fingerprint at capture
    time (`autoforge gate check`). Readiness evaluation
    (`autoforge evidence summary`, `src/quality/readiness.ts`) excludes
    evidence whose revision or environment no longer matches the current
    one from authority selection, so a stale-revision or different-platform
    result can no longer silently validate the current project state.
    Legacy evidence records without these fields are unaffected and
    continue to work exactly as before.
  ```

- [ ] **Step 3: Run full verification**

  Run:

  ```bash
  npx vitest run
  npx tsc --noEmit
  npx prettier --check CHANGELOG.md
  node packages/config/src/check-boundaries.mjs
  npm run build
  ```

  Expected: all green; build succeeds with a bundle size similar to (a few KB larger than) the pre-existing baseline.

- [ ] **Step 4: Commit**

  ```bash
  git add CHANGELOG.md
  git commit -m "docs: record evidence revision/environment/gate-fingerprint binding in the changelog

  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HTP99nx36hpQfVrcPrChg1"
  ```

---

### Task 7: Final whole-feature verification

**Files:** none (verification only).

- [ ] **Step 1: Run the complete workspace check**

  Run: `npm run workspace:check`
  Expected: all 9 tasks pass.

- [ ] **Step 2: Confirm git state**

  Run: `git status --short && git log --oneline -8`
  Expected: clean working tree; the 6 commits from Tasks 1–6 visible at the top of `git log`.

  Report back that all tasks are complete and verification is green, and stop — do not push, tag, or release as part of this plan; that is a separate step the user will direct explicitly.
