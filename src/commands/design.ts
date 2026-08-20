import { readFile } from "node:fs/promises";

import { EXIT_CODE, type ExitCode } from "../core/errors.js";
import type { LogWriter } from "../core/logger.js";
import { resolveContainedProjectPath } from "../core/paths.js";
import { discoverProjectRoot } from "../core/project.js";
import {
  parseDesignSpecificationMarkdown,
  serializeSpecificationMarkdown,
} from "../specifications/codec.js";
import { SpecificationRegistry } from "../specifications/registry.js";
import {
  DESIGN_SPECIFICATION_TYPES,
  designSpecificationSchema,
  designSpecificationTypeSchema,
  type DesignSpecification,
  type DesignSpecificationType,
} from "../specifications/schemas.js";
import { SpecificationFileStore } from "../specifications/store.js";

export interface DesignCommandOptions {
  args: readonly string[];
  output: LogWriter;
  startDirectory: string;
}

function usage(message: string, output: LogWriter): ExitCode {
  output.stderr(message);
  output.stderr(
    "Usage: autoforge design <validate|import> <file> | autoforge design list [--type <type>] | autoforge design show <id>",
  );
  return EXIT_CODE.usage;
}

function formatList(specifications: readonly DesignSpecification[]): string {
  return [
    `AutoForge design specifications: ${specifications.length}`,
    ...specifications.map(
      (specification) =>
        `${specification.id} [${specification.type}] — ${specification.description}`,
    ),
  ].join("\n");
}

async function readDesignFile(
  projectRoot: string,
  candidatePath: string,
): Promise<DesignSpecification> {
  const resolved = await resolveContainedProjectPath(
    projectRoot,
    candidatePath,
  );
  return parseDesignSpecificationMarkdown(
    await readFile(resolved.absolutePath, "utf8"),
    resolved.relativePath,
  );
}

function designSpecifications(
  specifications: readonly unknown[],
): DesignSpecification[] {
  return specifications.flatMap((specification) => {
    const result = designSpecificationSchema.safeParse(specification);
    return result.success ? [result.data] : [];
  });
}

export async function runDesignCommand(
  options: DesignCommandOptions,
): Promise<ExitCode> {
  const [action, subject, ...rest] = options.args;
  const project = await discoverProjectRoot({
    startDirectory: options.startDirectory,
  });
  const registry = new SpecificationRegistry(
    new SpecificationFileStore(project.path),
  );

  if (action === "validate" || action === "import") {
    if (!subject || rest.length > 0) {
      return usage(
        `Design ${action} requires exactly one file.`,
        options.output,
      );
    }
    const specification = await readDesignFile(project.path, subject);
    if (action === "validate") {
      options.output.stdout(
        `Valid design specification ${specification.id} (${specification.type}).`,
      );
      return EXIT_CODE.success;
    }
    const {
      updatedAt: _updatedAt,
      design,
      knowledge,
      ...input
    } = specification;
    if (design === undefined) {
      return usage("Design metadata is required for import.", options.output);
    }
    const result = await registry.register({
      ...input,
      design,
      ...(knowledge === undefined ? {} : { knowledge }),
    });
    options.output.stdout(
      `Imported design specification ${result.specification.id} to ${result.path}`,
    );
    return EXIT_CODE.success;
  }

  if (action === "list") {
    let type: DesignSpecificationType | undefined;
    if (subject !== undefined || rest.length > 0) {
      if (subject !== "--type" || rest.length !== 1 || !rest[0]) {
        return usage("Invalid design list arguments.", options.output);
      }
      const result = designSpecificationTypeSchema.safeParse(rest[0]);
      if (!result.success) {
        return usage(
          `Unknown design type ${rest[0]}; expected ${DESIGN_SPECIFICATION_TYPES.join(", ")}.`,
          options.output,
        );
      }
      type = result.data;
    }
    const specifications = designSpecifications(
      await registry.list(type ? { types: [type] } : {}),
    );
    options.output.stdout(formatList(specifications));
    return EXIT_CODE.success;
  }

  if (action === "show") {
    if (!subject || rest.length > 0) {
      return usage("Design show requires exactly one ID.", options.output);
    }
    const specification = designSpecificationSchema.safeParse(
      await registry.read(subject),
    );
    if (!specification.success) {
      return usage(
        `${subject} is not a typed design specification.`,
        options.output,
      );
    }
    options.output.stdout(
      serializeSpecificationMarkdown(specification.data).trimEnd(),
    );
    return EXIT_CODE.success;
  }

  return usage(
    "Design command requires validate, import, list, or show.",
    options.output,
  );
}
