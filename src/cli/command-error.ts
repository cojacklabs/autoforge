import { z } from "zod";

import { PriozarError, EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";

export function reportCommandError(
  error: unknown,
  output: LogWriter,
): ExitCode {
  if (error instanceof z.ZodError) {
    output.stderr(`Error: ${z.prettifyError(error)}`);
    return EXIT_CODE.usage;
  }
  if (error instanceof PriozarError) {
    output.stderr(`Error: ${error.message}`);
    return error.exitCode;
  }
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    output.stderr(`Error: ${error.message}`);
    return EXIT_CODE.notFound;
  }
  if (error instanceof Error && "code" in error && error.code === "EEXIST") {
    output.stderr(`Error: ${error.message}`);
    return EXIT_CODE.conflict;
  }
  if (error instanceof Error) {
    output.stderr(`Error: ${error.message}`);
    return EXIT_CODE.unexpected;
  }
  output.stderr("Error: An unexpected command failure occurred.");
  return EXIT_CODE.unexpected;
}
