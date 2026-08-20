import { parse, stringify } from "yaml";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import {
  designSpecificationSchema,
  specificationFrontmatterSchema,
  specificationSchema,
  type DesignSpecification,
  type Specification,
} from "./schemas.js";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/;

function invalidSpecification(
  message: string,
  details: Readonly<Record<string, unknown>>,
  cause?: unknown,
): AutoForgeError {
  return new AutoForgeError("INVALID_STATE", message, {
    cause,
    details,
    exitCode: EXIT_CODE.invalidState,
  });
}

export function parseSpecificationMarkdown(
  markdown: string,
  sourcePath = "specification",
): Specification {
  const match = FRONTMATTER_PATTERN.exec(markdown);
  if (!match) {
    throw invalidSpecification(
      `Specification ${sourcePath} requires YAML frontmatter`,
      { path: sourcePath },
    );
  }
  let metadata: unknown;
  try {
    metadata = parse(match[1] ?? "");
  } catch (error) {
    throw invalidSpecification(
      `Specification ${sourcePath} contains invalid YAML`,
      { path: sourcePath },
      error,
    );
  }
  const frontmatter =
    metadata !== null &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
      ? metadata
      : {};
  const result = specificationSchema.safeParse({
    ...frontmatter,
    content: (match[2] ?? "").replace(/\s+$/, ""),
  });
  if (!result.success) {
    throw invalidSpecification(`Specification ${sourcePath} is invalid`, {
      path: sourcePath,
      issues: result.error.issues,
    });
  }
  return result.data;
}

export function serializeSpecificationMarkdown(
  specification: Specification,
): string {
  const result = specificationSchema.safeParse(specification);
  if (!result.success) {
    throw new AutoForgeError(
      "INVALID_ARGUMENT",
      "Refusing to serialize an invalid specification",
      {
        details: { issues: result.error.issues },
        exitCode: EXIT_CODE.usage,
      },
    );
  }
  const { content, ...metadata } = result.data;
  const frontmatter = specificationFrontmatterSchema.parse(metadata);
  return `---\n${stringify(frontmatter, { lineWidth: 0 }).trimEnd()}\n---\n\n${content.trim()}\n`;
}

export function parseDesignSpecificationMarkdown(
  markdown: string,
  sourcePath = "design specification",
): DesignSpecification {
  const specification = parseSpecificationMarkdown(markdown, sourcePath);
  const result = designSpecificationSchema.safeParse(specification);
  if (!result.success) {
    throw invalidSpecification(
      `Design specification ${sourcePath} is invalid`,
      {
        path: sourcePath,
        issues: result.error.issues,
      },
    );
  }
  return result.data;
}
