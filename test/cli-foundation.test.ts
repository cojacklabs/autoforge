import { describe, expect, it, vi } from "vitest";

import { AUTOFORGE_HELP } from "../src/cli/help.js";
import { findPackageVersion, main } from "../src/cli/index.js";
import { runCli } from "../src/cli/router.js";
import { EXIT_CODE } from "../src/core/errors.js";

function createDependencies() {
  return {
    output: {
      stdout: vi.fn(),
      stderr: vi.fn(),
    },
    version: "0.6.0-test",
    commands: {
      add: vi.fn(async () => EXIT_CODE.success),
      check: vi.fn(async () => EXIT_CODE.success),
      context: vi.fn(async () => EXIT_CODE.success),
      decide: vi.fn(async () => EXIT_CODE.success),
      design: vi.fn(async () => EXIT_CODE.success),
      doctrine: vi.fn(async () => EXIT_CODE.success),
      doctor: vi.fn(async () => EXIT_CODE.success),
      done: vi.fn(async () => EXIT_CODE.success),
      gate: vi.fn(async () => EXIT_CODE.success),
      init: vi.fn(async () => EXIT_CODE.success),
      projects: vi.fn(async () => EXIT_CODE.success),
      orchestrate: vi.fn(async () => EXIT_CODE.success),
      schemas: vi.fn(async () => EXIT_CODE.success),
      migrate: vi.fn(async () => EXIT_CODE.success),
      recap: vi.fn(async () => EXIT_CODE.success),
      start: vi.fn(async () => EXIT_CODE.success),
      tui: vi.fn(async () => EXIT_CODE.success),
      why: vi.fn(async () => EXIT_CODE.success),
    },
  };
}

describe("foundation CLI router", () => {
  it("accepts a project selector before the command", async () => {
    const output = { stdout: vi.fn(), stderr: vi.fn() };

    await expect(
      main(["--project", "/tmp/example", "version"], output),
    ).resolves.toBe(EXIT_CODE.success);
    expect(output.stdout).toHaveBeenCalledWith(
      expect.stringMatching(/^AutoForge \d+\.\d+\.\d+$/),
    );
    expect(output.stderr).not.toHaveBeenCalled();
  });

  it.each([
    { args: [] },
    { args: ["help"] },
    { args: ["-h"] },
    { args: ["--help"] },
  ])("prints canonical help for %j", async ({ args }) => {
    const dependencies = createDependencies();

    await expect(runCli(args, dependencies)).resolves.toBe(EXIT_CODE.success);
    expect(dependencies.output.stdout).toHaveBeenCalledOnce();
    expect(dependencies.output.stdout).toHaveBeenCalledWith(AUTOFORGE_HELP);
    expect(dependencies.output.stderr).not.toHaveBeenCalled();
  });

  it.each([{ args: ["version"] }, { args: ["-v"] }, { args: ["--version"] }])(
    "prints the injected version for %j",
    async ({ args }) => {
      const dependencies = createDependencies();

      await expect(runCli(args, dependencies)).resolves.toBe(EXIT_CODE.success);
      expect(dependencies.output.stdout).toHaveBeenCalledWith(
        "AutoForge 0.6.0-test",
      );
      expect(dependencies.output.stderr).not.toHaveBeenCalled();
    },
  );

  it("routes init to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["init"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.init).toHaveBeenCalledWith([]);
  });

  it("routes doctor to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["doctor"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.doctor).toHaveBeenCalledWith([]);
  });

  it("routes migration arguments to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["migrate", "--dry-run"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.migrate).toHaveBeenCalledWith(["--dry-run"]);
  });

  it("routes projects arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["register", "/tmp/example-project"];

    await expect(runCli(["projects", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.projects).toHaveBeenCalledWith(args);
  });

  it("routes orchestration arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["ready"];

    await expect(runCli(["orchestrate", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.orchestrate).toHaveBeenCalledWith(args);
  });

  it("routes schema arguments to its injected command", async () => {
    const dependencies = createDependencies();
    await expect(runCli(["schemas", "list"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.schemas).toHaveBeenCalledWith(["list"]);
  });

  it("routes done to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["done"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.done).toHaveBeenCalledWith([]);
  });

  it("routes gate arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["check", "--path", "package.json"];

    await expect(runCli(["gate", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.gate).toHaveBeenCalledWith(args);
  });

  it("routes add arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["feature", "--name", "Kernel"];

    await expect(runCli(["add", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.add).toHaveBeenCalledWith(args);
  });

  it("routes decide arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["--statement", "Use local state"];

    await expect(runCli(["decide", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.decide).toHaveBeenCalledWith(args);
  });

  it("routes design arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["list", "--type", "screen"];

    await expect(runCli(["design", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.design).toHaveBeenCalledWith(args);
  });

  it("routes context arguments to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["context", "--explain"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.context).toHaveBeenCalledWith(["--explain"]);
  });

  it("routes check arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["--path", "src/context/packet.ts", "--agent", "codex"];

    await expect(runCli(["check", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.check).toHaveBeenCalledWith(args);
  });

  it("routes doctrine arguments to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["doctrine", "testing"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.doctrine).toHaveBeenCalledWith(["testing"]);
  });

  it("routes start arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["issue", "issue.fix-state"];

    await expect(runCli(["start", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.start).toHaveBeenCalledWith(args);
  });

  it("routes recap to its injected command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["recap"], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.recap).toHaveBeenCalledWith([]);
  });

  it("routes TUI arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["--snapshot", "--view", "health"];

    await expect(runCli(["tui", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.tui).toHaveBeenCalledWith(args);
  });

  it("routes why arguments to its injected command", async () => {
    const dependencies = createDependencies();
    const args = ["--query", "local state"];

    await expect(runCli(["why", ...args], dependencies)).resolves.toBe(
      EXIT_CODE.success,
    );
    expect(dependencies.commands.why).toHaveBeenCalledWith(args);
  });

  it("returns a usage error for an unknown command", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["unknown"], dependencies)).resolves.toBe(
      EXIT_CODE.usage,
    );
    expect(dependencies.output.stdout).not.toHaveBeenCalled();
    expect(dependencies.output.stderr).toHaveBeenNthCalledWith(
      1,
      "Unknown command: unknown",
    );
  });

  it("rejects arguments for foundation commands", async () => {
    const dependencies = createDependencies();

    await expect(runCli(["version", "extra"], dependencies)).resolves.toBe(
      EXIT_CODE.usage,
    );
    expect(dependencies.output.stdout).not.toHaveBeenCalled();
    expect(dependencies.output.stderr).toHaveBeenCalledWith(
      'Command "version" does not accept arguments.',
    );
  });
});

describe("foundation CLI entry", () => {
  it("discovers the repository package version", () => {
    expect(findPackageVersion()).toBe("0.23.0");
  });
});
