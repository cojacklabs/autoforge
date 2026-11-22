import { z } from "zod";

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

export const priozarErrorCodeSchema = z.enum([
  "INVALID_ARGUMENT",
  "PROJECT_NOT_FOUND",
  "INVALID_CONFIG",
  "INVALID_STATE",
  "STATE_CONFLICT",
  "FILESYSTEM_ERROR",
  "UNEXPECTED_ERROR",
  "UNSUPPORTED_PROTOCOL_VERSION",
]);
export type PriozarErrorCode = z.infer<typeof priozarErrorCodeSchema>;

export const errorEnvelopeSchema = z
  .object({
    protocolVersion: z.literal("1"),
    code: priozarErrorCodeSchema,
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export interface PriozarErrorOptions {
  cause?: unknown;
  details?: Readonly<Record<string, unknown>>;
  exitCode?: ExitCode;
}

export class PriozarError extends Error {
  readonly code: PriozarErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
  readonly exitCode: ExitCode;

  constructor(
    code: PriozarErrorCode,
    message: string,
    options: PriozarErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "PriozarError";
    this.code = code;
    this.details = options.details ?? {};
    this.exitCode = options.exitCode ?? EXIT_CODE.unexpected;
  }

  toEnvelope(): ErrorEnvelope {
    return errorEnvelopeSchema.parse({
      protocolVersion: "1",
      code: this.code,
      message: this.message,
      details: this.details,
    });
  }
}

export class ProjectNotFoundError extends PriozarError {
  constructor(startDirectory: string) {
    super(
      "PROJECT_NOT_FOUND",
      `Could not find a Priozar, Git, or package project from ${startDirectory}`,
      { details: { startDirectory }, exitCode: EXIT_CODE.notFound },
    );
    this.name = "ProjectNotFoundError";
  }
}

export function toPriozarError(error: unknown): PriozarError {
  if (error instanceof PriozarError) return error;
  if (error instanceof Error) {
    return new PriozarError("UNEXPECTED_ERROR", error.message, {
      cause: error,
    });
  }
  return new PriozarError("UNEXPECTED_ERROR", "An unexpected error occurred", {
    details: { value: error },
  });
}

// Deprecated AutoForge names, kept through the Priozar compatibility window.

/** @deprecated Use PriozarError. */
export const AutoForgeError = PriozarError;
/** @deprecated Use PriozarError. */
export type AutoForgeError = PriozarError;
/** @deprecated Use PriozarErrorCode. */
export type AutoForgeErrorCode = PriozarErrorCode;
/** @deprecated Use PriozarErrorOptions. */
export type AutoForgeErrorOptions = PriozarErrorOptions;
/** @deprecated Use toPriozarError. */
export const toAutoForgeError = toPriozarError;
/** @deprecated Use priozarErrorCodeSchema. */
export const autoForgeErrorCodeSchema = priozarErrorCodeSchema;
