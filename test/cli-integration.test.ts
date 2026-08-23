import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const BUNDLED_CLI = path.resolve("dist", "cli.js");
const temporaryDirectories: string[] = [];

interface CliProcessResult {
  exitCode: number | null;
  stderr: string;
  stdout: string;
}

async function createProject(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "autoforge-cli-integration-"),
  );
  temporaryDirectories.push(directory);
  await mkdir(path.join(directory, ".git"));
  return directory;
}

async function runBundledCli(
  cwd: string,
  args: readonly string[],
  entryPath = BUNDLED_CLI,
): Promise<CliProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entryPath, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stderr, stdout });
    });
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("bundled foundation CLI", () => {
  it("prints canonical help and the package version", async () => {
    const projectRoot = await createProject();

    await expect(runBundledCli(projectRoot, ["help"])).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: expect.stringContaining(
        "AutoForge — AI development context and control plane",
      ),
    });
    await expect(
      runBundledCli(projectRoot, ["version"]),
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: "AutoForge 0.21.2\n",
    });
  });

  it("runs through a symlinked package bin entrypoint", async () => {
    const projectRoot = await createProject();
    const link = path.join(projectRoot, "autoforge-bin");
    await symlink(BUNDLED_CLI, link);
    await expect(
      new Promise<CliProcessResult>((resolve, reject) => {
        const child = spawn(process.execPath, [link, "version"], {
          cwd: projectRoot,
          env: { ...process.env, NO_COLOR: "1" },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (stdout += chunk));
        child.stderr.on("data", (chunk: string) => (stderr += chunk));
        child.on("error", reject);
        child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
      }),
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: "AutoForge 0.21.2\n",
    });
  });

  it("runs through the npm-style node_modules/.bin path", async () => {
    const projectRoot = await createProject();
    const binDirectory = path.join(projectRoot, "node_modules", ".bin");
    await mkdir(binDirectory, { recursive: true });
    const link = path.join(binDirectory, "autoforge");
    await symlink(BUNDLED_CLI, link);

    await expect(
      runBundledCli(projectRoot, ["version"], link),
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: "AutoForge 0.21.2\n",
    });
  });

  it("keeps explicit project targeting isolated", async () => {
    const firstProject = await createProject();
    const secondProject = await createProject();
    await expect(runBundledCli(firstProject, ["init"])).resolves.toMatchObject({
      exitCode: 0,
    });
    await expect(runBundledCli(secondProject, ["init"])).resolves.toMatchObject(
      {
        exitCode: 0,
      },
    );

    await expect(
      runBundledCli(firstProject, ["--project", secondProject, "doctor"]),
    ).resolves.toMatchObject({
      exitCode: 0,
      stdout: expect.stringContaining(
        `Project root found at ${secondProject}.`,
      ),
    });
  });

  it("initializes and diagnoses a fresh repository", async () => {
    const projectRoot = await createProject();

    await expect(runBundledCli(projectRoot, ["init"])).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: expect.stringContaining("Initialized AutoForge"),
    });
    const config = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "config.json"),
        "utf8",
      ),
    );
    const metadata = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "metadata.json"),
        "utf8",
      ),
    );
    expect(config).toMatchObject({ schemaVersion: 1 });
    expect(metadata).toMatchObject({
      schemaVersion: 1,
      revision: 0,
      data: { projectId: config.projectId },
    });

    const doctor = await runBundledCli(projectRoot, ["doctor"]);
    expect(doctor).toMatchObject({ exitCode: 0, stderr: "" });
    expect(doctor.stdout).toContain(
      "[PASS] AutoForge installation is current.",
    );
  });

  it("coordinates a read-only assignment through the bundled CLI", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "feature",
      "--name",
      "Parallel Work",
      "--description",
      "Coordinate parallel work.",
    ]);
    await runBundledCli(projectRoot, [
      "add",
      "phase",
      "--name",
      "Research",
      "--description",
      "Research parallel implementation.",
      "--feature",
      "feature.parallel-work",
    ]);
    await runBundledCli(projectRoot, [
      "add",
      "task",
      "--name",
      "Parallel Research",
      "--description",
      "Research the parallel implementation path.",
      "--phase",
      "phase.research",
      "--include",
      "docs/**",
    ]);
    await writeFile(
      path.join(projectRoot, "orchestration-plan.json"),
      JSON.stringify({
        nodes: [
          {
            workId: "task.parallel-research",
            objective: "Research the parallel implementation path.",
            acceptanceCriteria: ["Findings are attached to the handoff."],
            stage: "research",
            role: "research",
            dependencies: [],
            priority: 75,
            releaseCritical: false,
            risk: "low",
            scope: { include: ["docs/**"], exclude: [] },
            requiredCapabilities: ["contextPackets"],
          },
        ],
      }),
    );

    await expect(
      runBundledCli(projectRoot, [
        "orchestrate",
        "plan",
        "orchestration-plan.json",
      ]),
    ).resolves.toMatchObject({ exitCode: 0, stderr: "" });
    const ready = await runBundledCli(projectRoot, ["orchestrate", "ready"]);
    expect(ready).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(ready.stdout)[0].workId).toBe("task.parallel-research");
    const claimed = await runBundledCli(projectRoot, [
      "orchestrate",
      "claim",
      "task.parallel-research",
      "--agent",
      "codex",
      "--role",
      "research",
      "--read-only",
    ]);
    expect(claimed).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(claimed.stdout)).toMatchObject({
      workId: "task.parallel-research",
      agentId: "codex",
      mode: "read",
      worktree: null,
    });
  });

  it("completes the bootstrap intent workflow and evidence approval pipeline", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, ["bootstrap", "scaffold"]);
    await writeFile(
      path.join(projectRoot, "architecture-intent.json"),
      JSON.stringify({
        raw: "Design the account architecture now. Email can be added in a later, additive channel. Never create matches without evidence.",
        objective: "Define the account matching architecture.",
        requirements: ["Specify the matching API."],
        assumptions: ["Email is related but separately scoped."],
        unknowns: [],
        constraints: ["Preserve deterministic matching."],
        acceptanceCriteria: ["The architecture is validated."],
      }),
    );

    const assessed = await runBundledCli(projectRoot, [
      "intent",
      "assess",
      "architecture-intent.json",
      "--kind",
      "architecture",
      "--persist",
    ]);
    expect(assessed).toMatchObject({ exitCode: 0, stderr: "" });
    const assessment = JSON.parse(assessed.stdout);
    expect(assessment.triage.labels).not.toContain("DEFERRED");
    expect(assessment.triage.labels).not.toContain("CONFLICT_DETECTED");
    expect(assessment.workflow.rationale.length).toBeGreaterThan(0);

    await runBundledCli(projectRoot, ["contract", "generate", "generic"]);
    const started = await runBundledCli(projectRoot, [
      "workflow",
      "start",
      "architecture-v1",
      "architecture",
    ]);
    expect(JSON.parse(started.stdout).kind).toBe("architecture-change");
    await runBundledCli(projectRoot, [
      "workflow",
      "advance",
      "architecture-v1",
    ]);
    await runBundledCli(projectRoot, [
      "workflow",
      "advance",
      "architecture-v1",
    ]);
    const completed = await runBundledCli(projectRoot, [
      "workflow",
      "advance",
      "architecture-v1",
    ]);
    expect(JSON.parse(completed.stdout).status).toBe("completed");

    const approved = await runBundledCli(projectRoot, [
      "bootstrap",
      "approve",
      "architecture",
      "--evidence",
      "architecture-v1",
    ]);
    expect(approved).toMatchObject({ exitCode: 0, stderr: "" });
    const gates = await runBundledCli(projectRoot, ["bootstrap", "gates"]);
    expect(JSON.parse(gates.stdout).gates.architecture).toBe("approved");
  });

  it("prints a TUI dashboard snapshot without a terminal", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);

    await expect(
      runBundledCli(projectRoot, ["tui", "--snapshot", "--view", "dashboard"]),
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: expect.stringContaining("AutoForge TUI"),
    });
  });

  it("backs up and migrates a legacy installation", async () => {
    const projectRoot = await createProject();
    await mkdir(path.join(projectRoot, ".autoforge", "ai"), {
      recursive: true,
    });
    await writeFile(
      path.join(projectRoot, ".autoforge", "package.json"),
      '{"name":"@cojacklabs/autoforge","version":"0.6.0"}\n',
    );
    await writeFile(
      path.join(projectRoot, ".autoforge", "ai", "legacy.md"),
      "legacy context\n",
    );

    await expect(
      runBundledCli(projectRoot, ["migrate", "--dry-run"]),
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: expect.stringContaining("migration plan"),
    });
    await expect(
      runBundledCli(projectRoot, ["migrate"]),
    ).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: expect.stringContaining("Validation: current"),
    });
    const entries = await readdir(projectRoot);
    const backup = entries.find((entry) =>
      entry.startsWith(".autoforge.backup-"),
    );
    expect(backup).toBeDefined();
    expect(
      await readFile(
        path.join(projectRoot, backup ?? "", "ai", "legacy.md"),
        "utf8",
      ),
    ).toBe("legacy context\n");
    expect(
      JSON.parse(
        await readFile(
          path.join(projectRoot, ".autoforge", "config.json"),
          "utf8",
        ),
      ),
    ).toMatchObject({ schemaVersion: 1 });
  });

  it("runs the retained quality gate through the bundled CLI", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await writeFile(path.join(projectRoot, "valid.json"), '{"valid":true}\n');

    const passing = await runBundledCli(projectRoot, [
      "gate",
      "check",
      "--path",
      "valid.json",
      "--json",
    ]);
    expect(passing).toMatchObject({ exitCode: 0, stderr: "" });
    expect(JSON.parse(passing.stdout)).toMatchObject({
      success: true,
      files: ["valid.json"],
    });

    await writeFile(
      path.join(projectRoot, "unsafe.txt"),
      'token = "abcdefghijklmnop"\n',
    );
    const failing = await runBundledCli(projectRoot, [
      "gate",
      "check",
      "--path",
      "unsafe.txt",
    ]);
    expect(failing.exitCode).toBe(4);
    expect(failing.stderr).toContain("value redacted");
    expect(failing.stderr).not.toContain("abcdefghijklmnop");
  });

  it("imports design context and delivers it through a build packet", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await writeFile(
      path.join(projectRoot, "compact-token.md"),
      "---\nid: token.spacing-compact\ntype: token\nname: Compact spacing\ndescription: Spacing for compact dashboard cards.\nrelationships: {}\ntags: [design, dashboard, spacing]\nsource: manual:design-system\nupdatedAt: 2026-08-20T18:00:00.000Z\ndesign:\n  kind: token\n  category: spacing\n  value: 0.75rem\n  modes:\n    comfortable: 1rem\n---\n\n# Compact spacing\n\nUse for dense dashboard card groups.\n",
    );

    const imported = await runBundledCli(projectRoot, [
      "design",
      "import",
      "compact-token.md",
    ]);
    expect(imported).toMatchObject({ exitCode: 0, stderr: "" });
    expect(imported.stdout).toContain("token.spacing-compact");

    const searched = await runBundledCli(projectRoot, [
      "design",
      "search",
      "compact",
    ]);
    expect(searched).toMatchObject({ exitCode: 0, stderr: "" });
    expect(searched.stdout).toContain("token.spacing-compact");

    await writeFile(
      path.join(projectRoot, "compact-token-updated.md"),
      (
        await readFile(path.join(projectRoot, "compact-token.md"), "utf8")
      ).replace(
        "Spacing for compact dashboard cards.",
        "Updated spacing for compact dashboard cards.",
      ),
    );
    const updated = await runBundledCli(projectRoot, [
      "design",
      "update",
      "compact-token-updated.md",
    ]);
    expect(updated).toMatchObject({ exitCode: 0, stderr: "" });
    const checked = await runBundledCli(projectRoot, ["design", "check"]);
    expect(checked).toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: "Design relationships: valid.\n",
    });

    await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Compact dashboard cards",
      "--description",
      "Apply compact spacing to dashboard cards",
      "--include",
      "src/dashboard/**",
    ]);
    await runBundledCli(projectRoot, [
      "start",
      "issue",
      "issue.compact-dashboard-cards",
    ]);
    const context = await runBundledCli(projectRoot, ["context"]);

    expect(context).toMatchObject({ exitCode: 0, stderr: "" });
    expect(context.stdout).toContain("token.spacing-compact");
    expect(context.stdout).toContain("**Design Contract:**");
    expect(context.stdout).toContain("**Category:** spacing");
  });

  it("refuses repeated initialization without changing config", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    const configPath = path.join(projectRoot, ".autoforge", "config.json");
    const originalConfig = await readFile(configPath, "utf8");

    const repeated = await runBundledCli(projectRoot, ["init"]);

    expect(repeated.exitCode).toBe(5);
    expect(repeated.stdout).toBe("");
    expect(repeated.stderr).toContain("AutoForge is already initialized");
    expect(await readFile(configPath, "utf8")).toBe(originalConfig);
  });

  it("adds work that survives separate CLI processes", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);

    const added = await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Persist CLI work",
      "--description",
      "Verify cross-process state",
      "--include",
      "src/**",
    ]);

    expect(added).toMatchObject({ exitCode: 0, stderr: "" });
    expect(added.stdout).toContain("Added issue issue.persist-cli-work");
    const work = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "work.json"),
        "utf8",
      ),
    );
    expect(work).toMatchObject({
      revision: 1,
      data: { issues: [{ id: "issue.persist-cli-work" }] },
    });
  });

  it("starts work and opens a session across CLI processes", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Start CLI work",
      "--description",
      "Verify lifecycle persistence",
      "--include",
      "src/**",
    ]);

    const started = await runBundledCli(projectRoot, [
      "start",
      "issue",
      "issue.start-cli-work",
    ]);

    expect(started).toMatchObject({ exitCode: 0, stderr: "" });
    expect(started.stdout).toContain("Started issue issue.start-cli-work");
    const work = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "work.json"),
        "utf8",
      ),
    );
    const session = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "session.json"),
        "utf8",
      ),
    );
    expect(work).toMatchObject({
      revision: 2,
      data: {
        issues: [{ id: "issue.start-cli-work", status: "active" }],
        activeWork: { kind: "issue", id: "issue.start-cli-work" },
      },
    });
    expect(session).toMatchObject({
      revision: 1,
      data: {
        current: {
          status: "active",
          activeWork: { kind: "issue", id: "issue.start-cli-work" },
        },
      },
    });
  });

  it("recaps active work from a separate CLI process", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Recap CLI work",
      "--description",
      "Verify recap output",
      "--include",
      "src/**",
    ]);
    await runBundledCli(projectRoot, [
      "start",
      "issue",
      "issue.recap-cli-work",
    ]);

    const recap = await runBundledCli(projectRoot, ["recap"]);

    expect(recap).toMatchObject({ exitCode: 0, stderr: "" });
    expect(recap.stdout).toContain("Status: active");
    expect(recap.stdout).toContain(
      "Active: issue issue.recap-cli-work — Recap CLI work",
    );
    expect(recap.stdout).toContain("Scope include: src/**");
    expect(recap.stdout).toContain("Session: session.");
  });

  it("generates reproducible context packets and optional explanations", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Generate Context",
      "--description",
      "Compile scoped guidance for active work",
      "--include",
      "src/context/**",
      "--exclude",
      "dist/**",
    ]);
    await runBundledCli(projectRoot, [
      "start",
      "issue",
      "issue.generate-context",
    ]);

    const generated = await runBundledCli(projectRoot, ["context"]);

    expect(generated).toMatchObject({ exitCode: 0, stderr: "" });
    expect(generated.stdout).toContain("# AutoForge Build Packet");
    expect(generated.stdout).toContain("issue.generate-context");
    expect(generated.stdout).toContain("## Allowed Files and Scope");
    expect(generated.stdout).toContain("`src/context/**`");
    const currentPath = path.join(projectRoot, ".autoforge/context/current.md");
    const packetPath = path.join(
      projectRoot,
      ".autoforge/context/packets/issue.generate-context.md",
    );
    const current = await readFile(currentPath, "utf8");
    expect(current).toBe(await readFile(packetPath, "utf8"));
    expect(current).toBe(`${generated.stdout.trimEnd()}\n`);

    const explained = await runBundledCli(projectRoot, [
      "context",
      "--explain",
    ]);
    expect(explained).toMatchObject({ exitCode: 0, stderr: "" });
    expect(explained.stdout).toContain("# Context Selection Explanation");
    expect(explained.stdout).toContain("## Excluded");
    expect(await readFile(currentPath, "utf8")).not.toContain(
      "# Context Selection Explanation",
    );
  });

  it("refreshes and enforces scoped guardrails across CLI processes", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Guard CLI edits",
      "--description",
      "Verify scoped enforcement",
      "--include",
      "src/**",
      "--exclude",
      "src/generated/**",
    ]);
    await runBundledCli(projectRoot, [
      "start",
      "issue",
      "issue.guard-cli-edits",
    ]);

    const allowed = await runBundledCli(projectRoot, [
      "check",
      "--refresh",
      "--path",
      "src/context/policy.ts",
      "--agent",
      "codex",
    ]);
    expect(allowed).toMatchObject({ exitCode: 0, stderr: "" });
    expect(allowed.stdout).toContain("AutoForge guardrail: PASS (advisory)");
    expect(allowed.stdout).toContain("Context: refreshed");

    const denied = await runBundledCli(projectRoot, [
      "check",
      "--path",
      "src/generated/client.ts",
      "--agent",
      "cursor",
    ]);
    expect(denied.exitCode).toBe(4);
    expect(denied.stdout).toBe("");
    expect(denied.stderr).toContain("explicitly excluded");

    const installed = await runBundledCli(projectRoot, [
      "check",
      "--install",
      "--agent",
      "claude",
    ]);
    expect(installed).toMatchObject({ exitCode: 0, stderr: "" });
    expect(installed.stdout).toContain("Agent setup: configured");
    const settings = JSON.parse(
      await readFile(path.join(projectRoot, ".claude/settings.json"), "utf8"),
    );
    expect(settings).toMatchObject({
      hooks: {
        PreToolUse: [
          expect.objectContaining({ matcher: "Edit|Write|NotebookEdit" }),
        ],
      },
    });
  });

  it("completes work and archives its session across CLI processes", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "issue",
      "--name",
      "Complete CLI work",
      "--description",
      "Verify done persistence",
      "--include",
      "src/**",
    ]);
    await runBundledCli(projectRoot, [
      "start",
      "issue",
      "issue.complete-cli-work",
    ]);
    await runBundledCli(projectRoot, [
      "decide",
      "--statement",
      "Document the CLI done fixture",
      "--reasoning",
      "Required by the documentation gate",
      "--consequence",
      "Recorded for test coverage",
      "--scope",
      "testing",
      "--keyword",
      "done-command",
      "--work",
      "issue.complete-cli-work",
    ]);

    const completed = await runBundledCli(projectRoot, ["done"]);

    expect(completed).toMatchObject({ exitCode: 0, stderr: "" });
    expect(completed.stdout).toContain(
      "Completed issue issue.complete-cli-work; ended session.",
    );
    const work = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "work.json"),
        "utf8",
      ),
    );
    const session = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "session.json"),
        "utf8",
      ),
    );
    expect(work).toMatchObject({
      revision: 3,
      data: {
        issues: [{ id: "issue.complete-cli-work", status: "completed" }],
        activeWork: null,
      },
    });
    expect(session).toMatchObject({
      revision: 2,
      data: {
        current: null,
        previous: [
          {
            status: "ended",
            activeWork: { kind: "issue", id: "issue.complete-cli-work" },
          },
        ],
      },
    });
  });

  it("records decision memory across CLI processes", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "add",
      "feature",
      "--name",
      "Decision Memory",
      "--description",
      "Persist rationale",
    ]);

    const recorded = await runBundledCli(projectRoot, [
      "decide",
      "--statement",
      "Use deterministic search",
      "--reasoning",
      "Results must remain explainable",
      "--consequence",
      "Search uses fixed weights",
      "--scope",
      "decisions",
      "--keyword",
      "deterministic",
      "--work",
      "feature.decision-memory",
    ]);

    expect(recorded).toMatchObject({ exitCode: 0, stderr: "" });
    expect(recorded.stdout).toContain(
      "Recorded decision decision.use-deterministic-search",
    );
    const decisions = JSON.parse(
      await readFile(
        path.join(projectRoot, ".autoforge", "state", "decisions.json"),
        "utf8",
      ),
    );
    expect(decisions).toMatchObject({
      revision: 1,
      data: {
        decisions: [
          {
            id: "decision.use-deterministic-search",
            relatedWork: ["feature.decision-memory"],
          },
        ],
      },
    });
  });

  it("retrieves decision rationale across CLI processes", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await runBundledCli(projectRoot, [
      "decide",
      "--statement",
      "Use deterministic search",
      "--reasoning",
      "Results must remain explainable",
      "--consequence",
      "Search uses fixed weights",
      "--scope",
      "decisions",
      "--keyword",
      "deterministic",
      "--keyword",
      "relevance",
    ]);

    const why = await runBundledCli(projectRoot, [
      "why",
      "--query",
      "determinism relevance",
    ]);

    expect(why).toMatchObject({ exitCode: 0, stderr: "" });
    expect(why.stdout).toContain("Decision matches: 1");
    expect(why.stdout).toContain("decision.use-deterministic-search");
    expect(why.stdout).toContain("Reasoning: Results must remain explainable");
    expect(why.stdout).toContain("keywords: relevance");
  });

  it("reports malformed state through doctor", async () => {
    const projectRoot = await createProject();
    await runBundledCli(projectRoot, ["init"]);
    await writeFile(
      path.join(projectRoot, ".autoforge", "config.json"),
      "{broken",
      "utf8",
    );

    const doctor = await runBundledCli(projectRoot, ["doctor"]);

    expect(doctor.exitCode).toBe(4);
    expect(doctor.stderr).toContain("[FAIL] Invalid JSON");
  });

  it("preserves a legacy installation", async () => {
    const projectRoot = await createProject();
    const legacyFile = path.join(projectRoot, ".autoforge", "ai", "README.md");
    await mkdir(path.dirname(legacyFile), { recursive: true });
    await writeFile(legacyFile, "legacy\n", "utf8");

    const initialization = await runBundledCli(projectRoot, ["init"]);

    expect(initialization.exitCode).toBe(5);
    expect(initialization.stderr).toContain("legacy AutoForge installation");
    expect(await readFile(legacyFile, "utf8")).toBe("legacy\n");
  });
});
