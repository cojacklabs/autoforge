import { describe, expect, it } from "vitest";

import { createInitialDoctrineRegistry } from "../src/doctrine/builtins.js";
import { doctrineSessionStateSchema } from "../src/doctrine/session.js";
import { evaluateGuardrails } from "../src/guardrails/policy.js";
import { sessionStateSchema, workStateSchema } from "../src/work/schemas.js";

const TIMESTAMP = "2026-08-20T18:00:00.000Z";

function fixture() {
  const activeWork = {
    kind: "issue" as const,
    id: "issue.guardrails",
    startedAt: TIMESTAMP,
  };
  return {
    work: workStateSchema.parse({
      features: [],
      phases: [],
      tasks: [],
      issues: [
        {
          id: "issue.guardrails",
          name: "Guard scoped edits",
          description: "Enforce active work boundaries.",
          status: "active",
          scope: {
            include: ["src/**", "README.md"],
            exclude: ["src/generated/**"],
          },
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        },
      ],
      activeWork,
    }),
    sessions: sessionStateSchema.parse({
      current: {
        id: "session.guardrails",
        status: "active",
        startedAt: TIMESTAMP,
        endedAt: null,
        activeWork,
      },
      previous: [],
    }),
    doctrineSessions: doctrineSessionStateSchema.parse({
      current: {
        sessionId: "session.guardrails",
        workKind: "issue",
        workId: "issue.guardrails",
        selectedAt: TIMESTAMP,
        endedAt: null,
        selections: [
          {
            doctrineId: "doctrine.router",
            score: 1_000,
            reasons: [
              {
                signal: "router",
                value: "doctrine.router",
                weight: 1_000,
              },
            ],
          },
        ],
      },
      previous: [],
    }),
    doctrines: createInitialDoctrineRegistry(TIMESTAMP),
  };
}

describe("guardrail policy", () => {
  it("allows included files when work, session, doctrine, and context agree", () => {
    const report = evaluateGuardrails({
      ...fixture(),
      contextFreshness: "current",
      enforcement: "advisory",
      agentId: "codex",
      targetPath: "src/context/packet.ts",
    });

    expect(report.allowed).toBe(true);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "active-work", status: "pass" }),
        expect.objectContaining({ id: "scope-boundary", status: "pass" }),
      ]),
    );
  });

  it("denies explicit exclusions and files outside include patterns", () => {
    const excluded = evaluateGuardrails({
      ...fixture(),
      contextFreshness: "current",
      enforcement: "hard",
      targetPath: "src/generated/client.ts",
    });
    const outside = evaluateGuardrails({
      ...fixture(),
      contextFreshness: "current",
      enforcement: "advisory",
      targetPath: "docs/architecture.md",
    });

    expect(excluded.allowed).toBe(false);
    expect(
      excluded.checks.find(({ id }) => id === "scope-boundary"),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("excluded"),
    });
    expect(outside.allowed).toBe(false);
    expect(
      outside.checks.find(({ id }) => id === "scope-boundary"),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("outside"),
    });
  });

  it("denies edits without active work and a matching session", () => {
    const inactive = fixture();
    inactive.work.issues[0]!.status = "ready";
    inactive.work.activeWork = null;
    inactive.sessions.current = null;
    inactive.doctrineSessions.current = null;
    const report = evaluateGuardrails({
      ...inactive,
      contextFreshness: "missing",
      enforcement: "hard",
      targetPath: "src/index.ts",
    });

    expect(report.allowed).toBe(false);
    expect(report.checks.filter(({ status }) => status === "fail")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "active-work" }),
        expect.objectContaining({ id: "session-consistency" }),
        expect.objectContaining({ id: "doctrine-requirements" }),
      ]),
    );
  });

  it("denies stale context and disabled selected doctrine", () => {
    const stale = fixture();
    const staleReport = evaluateGuardrails({
      ...stale,
      contextFreshness: "stale",
      enforcement: "advisory",
      targetPath: "README.md",
    });
    stale.doctrines.doctrines.find(
      ({ id }) => id === "doctrine.router",
    )!.status = "disabled";
    const doctrineReport = evaluateGuardrails({
      ...stale,
      contextFreshness: "current",
      enforcement: "advisory",
      targetPath: "README.md",
    });

    expect(
      staleReport.checks.find(({ id }) => id === "context-current"),
    ).toMatchObject({
      status: "fail",
      message: expect.stringContaining("stale"),
    });
    expect(
      doctrineReport.checks.find(({ id }) => id === "doctrine-requirements"),
    ).toMatchObject({ status: "fail" });
  });

  it("returns an inventory warning when no edit path is supplied", () => {
    const report = evaluateGuardrails({
      ...fixture(),
      contextFreshness: "current",
      enforcement: "advisory",
    });

    expect(report.allowed).toBe(true);
    expect(
      report.checks.find(({ id }) => id === "scope-boundary"),
    ).toMatchObject({ status: "warn" });
  });
});
