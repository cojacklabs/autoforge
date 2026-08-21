import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { GlobalWorkspaceStore } from "../workspace/global-store.js";

export async function runAssetsCommand(options: {
  args: readonly string[];
  output: LogWriter;
}): Promise<ExitCode> {
  const [action, kind] = options.args;
  if (
    action !== "list" ||
    !kind ||
    !["templates", "doctrines"].includes(kind) ||
    options.args.length !== 2
  ) {
    options.output.stderr("Usage: autoforge assets list templates|doctrines");
    return EXIT_CODE.usage;
  }
  const assets = await new GlobalWorkspaceStore().listAssets(
    kind as "templates" | "doctrines",
  );
  options.output.stdout(assets.join("\n"));
  return EXIT_CODE.success;
}
