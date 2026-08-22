import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { runBootstrapCommand } from "../src/commands/bootstrap.js";
import { scaffoldBootstrapManifest } from "../src/bootstrap/inspect.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("bootstrap command", () => {
  it("prints a readiness report", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-command-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["inspect"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"nextAction": "initialize"'),
    );
  });

  it("prints the scaffolded bootstrap manifest status", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-status-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["status"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"artifacts"'),
    );
  });

  it("records approved discovery input without overwriting it", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-discovery-"),
    );
    directories.push(project);
    const source = path.join(project, "discovery.json");
    await writeFile(
      source,
      JSON.stringify({
        approved: true,
        vision: "A focused project",
        problem: "Manual setup is slow",
        users: ["builders"],
        useCases: ["bootstrap a repository"],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["discover", source],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      readFile(
        path.join(project, ".autoforge", "bootstrap", "discovery.json"),
        "utf8",
      ),
    ).resolves.toContain('"approved": true');
  });

  it("reports pending acceptance gates", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-gates-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({ args: ["gates"], output, startDirectory: project }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"ready": false'),
    );
  });

  it("approves a bootstrap artifact and updates gate readiness", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-approve-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["approve", "architecture"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await runBootstrapCommand({
      args: ["gates"],
      output,
      startDirectory: project,
    });
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"architecture": "approved"'),
    );
    await expect(
      readFile(
        path.join(project, ".autoforge", "bootstrap", "manifest.json"),
        "utf8",
      ),
    ).resolves.toContain('"approvedAt"');
  });

  it("rejects incomplete workflow evidence for bootstrap approval", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-evidence-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    await mkdir(path.join(project, ".autoforge", "workflows"), {
      recursive: true,
    });
    await writeFile(
      path.join(project, ".autoforge", "workflows", "architecture-v1.json"),
      JSON.stringify({
        id: "architecture-v1",
        kind: "architecture-change",
        currentStage: "planning",
        completedStages: ["research"],
        status: "active",
        updatedAt: "2026-08-22T00:00:00.000Z",
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["approve", "architecture", "--evidence", "architecture-v1"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(5);
    expect(output.stderr).toHaveBeenCalledWith(
      "Error: Workflow architecture-v1 is not completed",
    );
  });

  it("validates the complete bootstrap workflow", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-e2e-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".git"));
    const source = path.join(project, "approved-discovery.json");
    await writeFile(
      source,
      JSON.stringify({
        approved: true,
        vision: "A complete workflow",
        problem: "Project context is fragmented",
        users: ["teams"],
        useCases: ["capture project intent"],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["inspect"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      runBootstrapCommand({
        args: ["scaffold"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      runBootstrapCommand({
        args: ["discover", source],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      runBootstrapCommand({
        args: ["status"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      runBootstrapCommand({ args: ["gates"], output, startDirectory: project }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"ready": false'),
    );
  });

  it("generates a canonical vision document from discovery", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-vision-"),
    );
    directories.push(project);
    const source = path.join(project, "discovery.json");
    await writeFile(
      source,
      JSON.stringify({
        approved: true,
        vision: "Make project direction durable",
        problem: "Ideas are lost between conversations",
        users: ["founders"],
        useCases: ["capture a product direction"],
      }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };
    await mkdir(path.join(project, ".git"));
    await scaffoldBootstrapManifest(project);
    await runBootstrapCommand({
      args: ["discover", source],
      output,
      startDirectory: project,
    });
    await expect(
      runBootstrapCommand({
        args: ["vision"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      readFile(path.join(project, "VISION.md"), "utf8"),
    ).resolves.toContain("Make project direction durable");
    await writeFile(
      source,
      JSON.stringify({
        approved: true,
        vision: "Expand durable direction",
        problem: "New ideas can conflict",
        users: ["founders", "teams"],
        useCases: ["review a vision amendment"],
      }),
    );
    await expect(
      runBootstrapCommand({
        args: ["vision-amend", source],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      readFile(path.join(project, "VISION.md"), "utf8"),
    ).resolves.toContain("Expand durable direction");
    await writeFile(
      path.join(project, "VISION.md"),
      `${await readFile(path.join(project, "VISION.md"), "utf8")}\n## Non-Goals\n\n- Build a social network.\n`,
    );
    await expect(
      runBootstrapCommand({
        args: ["vision-check", "Build a social network"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"conflict": true'),
    );
    await expect(
      runBootstrapCommand({
        args: ["vision-approve", "Build a social network"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    await expect(
      readFile(
        path.join(project, ".autoforge", "bootstrap", "vision-approvals.json"),
        "utf8",
      ),
    ).resolves.toContain('"approved": true');
    await expect(
      readFile(
        path.join(project, ".autoforge", "bootstrap", "manifest.json"),
        "utf8",
      ),
    ).resolves.toContain('"status": "approved"');
  });

  it("returns targeted questions for incomplete discovery", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-questions-"),
    );
    directories.push(project);
    const source = path.join(project, "partial.json");
    await writeFile(source, JSON.stringify({ vision: "A clear direction" }));
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["discovery-questions", source],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"complete": false'),
    );
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining(
        "What specific problem should the project solve?",
      ),
    );
  });

  it("preserves legacy mode while exposing migration readiness", async () => {
    const project = await mkdtemp(
      path.join(os.tmpdir(), "autoforge-bootstrap-legacy-e2e-"),
    );
    directories.push(project);
    await mkdir(path.join(project, ".autoforge", "ai"), { recursive: true });
    await writeFile(
      path.join(project, ".autoforge", "package.json"),
      JSON.stringify({ name: "@cojacklabs/autoforge", version: "0.6.2" }),
    );
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      runBootstrapCommand({
        args: ["inspect"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(0);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringContaining('"nextAction": "migrate"'),
    );
    await expect(
      runBootstrapCommand({
        args: ["status"],
        output,
        startDirectory: project,
      }),
    ).resolves.toBe(3);
  });
});
