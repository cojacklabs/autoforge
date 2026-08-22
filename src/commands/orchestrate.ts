import { readFile } from "node:fs/promises";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  OrchestrationService,
  planFromWorkState,
} from "../orchestration/service.js";
import {
  orchestrationHandoffInputSchema,
  orchestrationPlanInputSchema,
  orchestrationRoleSchema,
} from "../orchestration/schemas.js";
import { createWorkStateStore } from "../state/kernel.js";
import { inputSchemaJson } from "../input-schemas/catalog.js";

export interface OrchestrateCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(output: LogWriter): ExitCode {
  output.stderr(
    "Usage: autoforge orchestrate plan [json-file] | orchestrate status | orchestrate ready | orchestrate claim <work-id> --agent <id> [--role <role>] [--read-only] [--ttl <minutes>] | orchestrate handoff <assignment-id> <json-file> | orchestrate release <assignment-id> | orchestrate approve <gate-id> [--by <actor>] | orchestrate prioritize <work-id> <0-100> | orchestrate explain <work-id>",
  );
  return EXIT_CODE.usage;
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function hasValidOption(args: readonly string[], name: string): boolean {
  const index = args.indexOf(name);
  return index === -1 || Boolean(args[index + 1]);
}

export async function runOrchestrateCommand(
  options: OrchestrateCommandOptions,
): Promise<ExitCode> {
  const [action, target, artifact] = options.args;
  if (!action) return usage(options.output);
  if (
    target === "--schema" &&
    options.args.length === 2 &&
    (action === "plan" || action === "handoff")
  ) {
    options.output.stdout(
      JSON.stringify(
        inputSchemaJson(
          action === "plan" ? "orchestrate-plan" : "orchestrate-handoff",
        ),
        null,
        2,
      ),
    );
    return EXIT_CODE.success;
  }
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const service = new OrchestrationService(project.path);

  if (action === "plan") {
    if (options.args.length > 2) return usage(options.output);
    const plan = target
      ? orchestrationPlanInputSchema.parse(
          JSON.parse(
            await readFile(
              (await resolveContainedProjectPath(project.path, target))
                .absolutePath,
              "utf8",
            ),
          ) as unknown,
        )
      : planFromWorkState(
          (await createWorkStateStore(project.path).read()).state.data,
        );
    options.output.stdout(JSON.stringify(await service.plan(plan), null, 2));
    return EXIT_CODE.success;
  }

  if (action === "status" || action === "ready") {
    if (options.args.length !== 1) return usage(options.output);
    options.output.stdout(
      JSON.stringify(
        action === "status" ? await service.status() : await service.ready(),
        null,
        2,
      ),
    );
    return EXIT_CODE.success;
  }

  if (action === "claim") {
    if (
      !target ||
      !option(options.args, "--agent") ||
      !hasValidOption(options.args, "--role") ||
      !hasValidOption(options.args, "--ttl")
    ) {
      return usage(options.output);
    }
    const ttl = option(options.args, "--ttl");
    const role = option(options.args, "--role");
    const result = await service.claim({
      workId: target,
      agentId: option(options.args, "--agent")!,
      ...(role ? { role: orchestrationRoleSchema.parse(role) } : {}),
      mode: options.args.includes("--read-only") ? "read" : "write",
      ...(ttl ? { ttlMinutes: Number(ttl) } : {}),
    });
    options.output.stdout(JSON.stringify(result, null, 2));
    return EXIT_CODE.success;
  }

  if (action === "handoff") {
    if (!target || !artifact || options.args.length !== 3)
      return usage(options.output);
    const handoff = orchestrationHandoffInputSchema.parse(
      JSON.parse(
        await readFile(
          (await resolveContainedProjectPath(project.path, artifact))
            .absolutePath,
          "utf8",
        ),
      ) as unknown,
    );
    options.output.stdout(
      JSON.stringify(await service.handoff(target, handoff), null, 2),
    );
    return EXIT_CODE.success;
  }

  if (action === "release" || action === "explain") {
    if (!target || options.args.length !== 2) return usage(options.output);
    options.output.stdout(
      JSON.stringify(
        action === "release"
          ? await service.release(target)
          : await service.explain(target),
        null,
        2,
      ),
    );
    return EXIT_CODE.success;
  }

  if (action === "approve") {
    if (!target || !hasValidOption(options.args, "--by"))
      return usage(options.output);
    const actor = option(options.args, "--by") ?? process.env.USER ?? "human";
    options.output.stdout(
      JSON.stringify(await service.approve(target, actor), null, 2),
    );
    return EXIT_CODE.success;
  }

  if (action === "prioritize") {
    if (!target || !artifact || options.args.length !== 3) {
      return usage(options.output);
    }
    options.output.stdout(
      JSON.stringify(
        await service.prioritize(target, Number(artifact)),
        null,
        2,
      ),
    );
    return EXIT_CODE.success;
  }

  return usage(options.output);
}
