import { describe, expect, it } from "vitest";
import { evaluateReadiness } from "../src/quality/readiness.js";
import type { ValidationEvidence } from "../src/quality/evidence.js";

const evidence = (
  id: string,
  status: ValidationEvidence["status"],
  options: Partial<ValidationEvidence> = {},
): ValidationEvidence => ({
  id: `evidence.${id}`,
  gateId: "tests",
  status,
  severity: "required",
  traceIds: [],
  reason: `${id} result`,
  capturedAt: "2026-08-22T00:00:00.000Z",
  ...options,
});

describe("quality readiness", () => {
  it("blocks readiness on required failures only", () => {
    expect(
      evaluateReadiness([
        evidence("tests", "passed"),
        evidence("lint", "failed", {
          gateId: "lint",
          severity: "advisory",
        }),
      ]),
    ).toMatchObject({
      ready: true,
      total: 2,
      failed: 1,
      effectiveTotal: 1,
      effectivePassed: 1,
      blockers: [],
    });
    expect(evaluateReadiness([evidence("tests", "failed")])).toMatchObject({
      ready: false,
      blockers: ["tests: tests result"],
    });
  });

  it("uses the latest conclusive result for the same gate and work", () => {
    const result = evaluateReadiness([
      evidence("tests-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:00:00.000Z",
      }),
      evidence("tests-passed", "passed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:01:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: true,
      total: 2,
      failed: 1,
      effectiveTotal: 1,
      effectivePassed: 1,
      blockers: [],
      authoritativeEvidence: [
        {
          evidenceId: "evidence.tests-passed",
          workId: "issue.checkout",
          supersedes: ["evidence.tests-failed"],
        },
      ],
    });
  });

  it("orders offset timestamps by chronological instant for the same work", () => {
    const result = evaluateReadiness([
      evidence("tests-z-older", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T01:00:00+02:00",
      }),
      evidence("tests-a-newer", "passed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:30:00Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 1,
      effectivePassed: 1,
      authoritativeEvidence: [
        {
          evidenceId: "evidence.tests-a-newer",
          supersedes: ["evidence.tests-z-older"],
        },
      ],
    });
  });

  it("does not let one work item supersede another work item's failure", () => {
    const result = evaluateReadiness([
      evidence("checkout-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:00:00.000Z",
      }),
      evidence("search-passed", "passed", {
        workId: "issue.search",
        capturedAt: "2026-08-22T00:01:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: false,
      effectiveTotal: 2,
      effectivePassed: 1,
      effectiveFailed: 1,
      blockers: ["tests [issue.checkout]: checkout-failed result"],
    });
  });

  it("lets a later project-wide run supersede earlier work-scoped results", () => {
    const result = evaluateReadiness([
      evidence("checkout-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:00:00.000Z",
      }),
      evidence("project-passed", "passed", {
        capturedAt: "2026-08-22T00:01:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 1,
      effectivePassed: 1,
      authoritativeEvidence: [
        {
          evidenceId: "evidence.project-passed",
          workId: null,
          supersedes: ["evidence.checkout-failed"],
        },
      ],
    });
  });

  it("applies an offset-aware project-wide baseline to work evidence", () => {
    const result = evaluateReadiness([
      evidence("checkout-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T01:00:00+02:00",
      }),
      evidence("project-passed", "passed", {
        capturedAt: "2026-08-22T00:30:00Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: true,
      effectiveTotal: 1,
      effectivePassed: 1,
      authoritativeEvidence: [
        {
          evidenceId: "evidence.project-passed",
          workId: null,
          supersedes: ["evidence.checkout-failed"],
        },
      ],
    });
  });

  it("keeps a later work failure visible after a project-wide pass", () => {
    const result = evaluateReadiness([
      evidence("project-passed", "passed", {
        capturedAt: "2026-08-22T00:00:00.000Z",
      }),
      evidence("checkout-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:01:00.000Z",
      }),
      evidence("search-passed", "passed", {
        workId: "issue.search",
        capturedAt: "2026-08-22T00:02:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: false,
      effectiveTotal: 3,
      effectivePassed: 2,
      effectiveFailed: 1,
      blockers: ["tests [issue.checkout]: checkout-failed result"],
    });
  });

  it("does not let a skipped rerun erase a conclusive failure", () => {
    const result = evaluateReadiness([
      evidence("tests-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:00:00.000Z",
      }),
      evidence("tests-skipped", "skipped", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:01:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: false,
      effectiveTotal: 1,
      effectiveFailed: 1,
      effectiveSkipped: 0,
      authoritativeEvidence: [
        { evidenceId: "evidence.tests-failed", supersedes: [] },
      ],
    });
  });

  it("uses evidence IDs to resolve timestamp ties independent of input order", () => {
    const failed = evidence("tests-a", "failed", {
      workId: "issue.checkout",
      capturedAt: "2026-08-22T00:00:00Z",
    });
    const passed = evidence("tests-z", "passed", {
      workId: "issue.checkout",
      capturedAt: "2026-08-22T01:00:00+01:00",
    });

    for (const records of [
      [failed, passed],
      [passed, failed],
    ]) {
      expect(evaluateReadiness(records)).toMatchObject({
        ready: true,
        effectiveTotal: 1,
        authoritativeEvidence: [
          {
            evidenceId: "evidence.tests-z",
            supersedes: ["evidence.tests-a"],
          },
        ],
      });
    }
  });

  it("evaluates an explicit work from its own and project-wide evidence", () => {
    const records = [
      evidence("project-passed", "passed", {
        capturedAt: "2026-08-22T00:00:00.000Z",
      }),
      evidence("checkout-failed", "failed", {
        workId: "issue.checkout",
        capturedAt: "2026-08-22T00:01:00.000Z",
      }),
      evidence("search-passed", "passed", {
        workId: "issue.search",
        capturedAt: "2026-08-22T00:02:00.000Z",
      }),
    ];

    expect(
      evaluateReadiness(records, { workId: "issue.checkout" }),
    ).toMatchObject({
      ready: false,
      effectiveTotal: 2,
      effectivePassed: 1,
      effectiveFailed: 1,
      blockers: ["tests [issue.checkout]: checkout-failed result"],
    });
    expect(
      evaluateReadiness(records, { workId: "issue.search" }),
    ).toMatchObject({
      ready: true,
      effectiveTotal: 2,
      effectivePassed: 2,
    });
  });

  it("does not let narrower work evidence clear a project-wide failure", () => {
    const result = evaluateReadiness(
      [
        evidence("project-failed", "failed", {
          capturedAt: "2026-08-22T00:00:00.000Z",
        }),
        evidence("checkout-passed", "passed", {
          workId: "issue.checkout",
          capturedAt: "2026-08-22T00:01:00.000Z",
        }),
      ],
      { workId: "issue.checkout" },
    );

    expect(result).toMatchObject({
      ready: false,
      effectiveTotal: 2,
      effectivePassed: 1,
      effectiveFailed: 1,
      blockers: ["tests: project-failed result"],
    });
  });

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
});
