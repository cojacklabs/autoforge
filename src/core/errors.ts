export const EXIT_CODE = {
  success: 0,
  unexpected: 1,
  usage: 2,
  notFound: 3,
  invalidState: 4,
  conflict: 5,
  filesystem: 6,
} as const;

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];

export type AutoForgeErrorCode =
  | "INVALID_ARGUMENT"
  | "PROJECT_NOT_FOUND"
  | "INVALID_CONFIG"
  | "INVALID_STATE"
  | "STATE_CONFLICT"
  | "FILESYSTEM_ERROR"
  | "UNEXPECTED_ERROR";

export interface AutoForgeErrorOptions {
  cause?: unknown;
  details?: Readonly<Record<string, unknown>>;
  exitCode?: ExitCode;
}

export class AutoForgeError extends Error {
  readonly code: AutoForgeErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
  readonly exitCode: ExitCode;

  constructor(
    code: AutoForgeErrorCode,
    message: string,
    options: AutoForgeErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AutoForgeError";
    this.code = code;
    this.details = options.details ?? {};
    this.exitCode = options.exitCode ?? EXIT_CODE.unexpected;
  }
}

export class ProjectNotFoundError extends AutoForgeError {
  constructor(startDirectory: string) {
    super(
      "PROJECT_NOT_FOUND",
      `Could not find an AutoForge, Git, or package project from ${startDirectory}`,
      {
        details: { startDirectory },
        exitCode: EXIT_CODE.notFound,
      },
    );
    this.name = "ProjectNotFoundError";
  }
}

export function toAutoForgeError(error: unknown): AutoForgeError {
  if (error instanceof AutoForgeError) {
    return error;
  }

  if (error instanceof Error) {
    return new AutoForgeError("UNEXPECTED_ERROR", error.message, {
      cause: error,
    });
  }

  return new AutoForgeError(
    "UNEXPECTED_ERROR",
    "An unexpected error occurred",
    {
      details: { value: error },
    },
  );
}
