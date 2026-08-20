export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export interface LogWriter {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface LoggerOptions {
  level?: LogLevel;
  writer?: LogWriter;
}

const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.POSITIVE_INFINITY,
};

const consoleWriter: LogWriter = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
};

function formatMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  return `${message} ${JSON.stringify(context)}`;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? "info";
  const writer = options.writer ?? consoleWriter;

  const shouldWrite = (messageLevel: Exclude<LogLevel, "silent">): boolean =>
    LOG_PRIORITY[messageLevel] >= LOG_PRIORITY[level];

  return {
    debug(message, context) {
      if (shouldWrite("debug")) {
        writer.stdout(formatMessage(message, context));
      }
    },
    info(message, context) {
      if (shouldWrite("info")) {
        writer.stdout(formatMessage(message, context));
      }
    },
    warn(message, context) {
      if (shouldWrite("warn")) {
        writer.stderr(formatMessage(message, context));
      }
    },
    error(message, context) {
      if (shouldWrite("error")) {
        writer.stderr(formatMessage(message, context));
      }
    },
  };
}

export const silentLogger: Logger = createLogger({ level: "silent" });
