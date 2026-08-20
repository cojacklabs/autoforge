import { z } from "zod";

import {
  CharacterTokenEstimator,
  type ContextTokenEstimator,
} from "./estimator.js";
import { contextSelectionSchema, type ContextSelection } from "./schemas.js";
import type { DesignMetadata } from "../specifications/schemas.js";

export const contextPacketSchema = z
  .object({
    id: z
      .string()
      .regex(
        /^packet\.(task|issue)\.[a-z0-9][a-z0-9._-]*$/,
        "Expected a packet ID derived from active work",
      ),
    workId: z.string().regex(/^(task|issue)\.[a-z0-9][a-z0-9._-]*$/),
    format: z.literal("markdown"),
    content: z.string().trim().min(1).max(1_000_000),
    estimatedTokens: z.number().int().positive(),
    sourceTokens: z.number().int().positive(),
    maxSourceTokens: z.number().int().positive(),
    sourceBudgetExceeded: z.boolean(),
  })
  .strict()
  .superRefine((packet, context) => {
    if (packet.id !== `packet.${packet.workId}`) {
      context.addIssue({
        code: "custom",
        message: "Packet ID must be derived from its work ID",
        path: ["id"],
      });
    }
    if (
      packet.sourceBudgetExceeded !==
      packet.sourceTokens > packet.maxSourceTokens
    ) {
      context.addIssue({
        code: "custom",
        message: "Packet source-budget status is inconsistent",
        path: ["sourceBudgetExceeded"],
      });
    }
  });

export type ContextPacket = z.infer<typeof contextPacketSchema>;

export interface ContextPacketCompilerOptions {
  estimator?: ContextTokenEstimator;
}

function inlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function code(value: string): string {
  return `\`${value.replaceAll("`", "\\`")}\``;
}

function bulletList(values: readonly string[], empty = "(none)"): string[] {
  return values.length > 0
    ? values.map((value) => `- ${code(value)}`)
    : [`- ${empty}`];
}

function renderWork(selection: ContextSelection): string[] {
  const { work } = selection;
  const lines = [
    "## Objective",
    "",
    work.objective,
    "",
    "## Active Work",
    "",
    `- **Type:** ${work.kind}`,
    `- **ID:** ${code(work.item.id)}`,
    `- **Name:** ${inlineText(work.item.name)}`,
  ];
  if (work.kind === "task") {
    lines.push(
      `- **Feature:** ${code(work.feature.id)} — ${inlineText(work.feature.name)}`,
      `- **Phase:** ${code(work.phase.id)} — ${inlineText(work.phase.name)} (#${work.phase.sequence})`,
    );
  }
  lines.push(
    "",
    work.item.description,
    "",
    "## Allowed Files and Scope",
    "",
    "### Include",
    "",
    ...bulletList(work.item.scope.include),
    "",
    "### Exclude",
    "",
    ...bulletList(work.item.scope.exclude),
  );
  return lines;
}

function renderDoctrines(selection: ContextSelection): string[] {
  const lines = ["## Applicable Doctrines", ""];
  if (selection.doctrines.length === 0) {
    return [...lines, "No doctrine fit within the selected context budget."];
  }
  for (const { doctrine } of selection.doctrines) {
    lines.push(
      `### ${inlineText(doctrine.title)} (${code(doctrine.id)})`,
      "",
      doctrine.summary,
      "",
      doctrine.content,
      "",
    );
  }
  return lines.slice(0, -1);
}

function renderDecisions(selection: ContextSelection): string[] {
  const lines = ["## Relevant Decisions", ""];
  if (selection.decisions.length === 0) {
    return [...lines, "No relevant decisions were selected."];
  }
  for (const { decision } of selection.decisions) {
    lines.push(
      `### ${code(decision.id)}`,
      "",
      `**Decision:** ${decision.statement}`,
      "",
      `**Reasoning:** ${decision.reasoning}`,
      "",
      "**Consequences:**",
      "",
      ...decision.consequences.map(
        (consequence) => `- ${inlineText(consequence)}`,
      ),
      "",
    );
  }
  return lines.slice(0, -1);
}

function renderRelationships(
  relationships: Readonly<Record<string, readonly string[]>>,
): string[] {
  const entries = Object.entries(relationships).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  if (entries.length === 0) {
    return [];
  }
  return [
    "**Relationships:**",
    "",
    ...entries.flatMap(([relationship, targets]) =>
      [...targets]
        .sort((left, right) => left.localeCompare(right))
        .map((target) => `- ${relationship} → ${code(target)}`),
    ),
    "",
  ];
}

function renderDesignMetadata(metadata: DesignMetadata | undefined): string[] {
  if (metadata === undefined) {
    return [];
  }
  const lines = ["**Design Contract:**", "", `- **Kind:** ${metadata.kind}`];
  switch (metadata.kind) {
    case "screen":
      lines.push(
        `- **Route:** ${metadata.route ? code(metadata.route) : "(not specified)"}`,
        `- **Regions:** ${metadata.regions.map(code).join(", ")}`,
        `- **Entry state:** ${metadata.entryState ? code(metadata.entryState) : "(not specified)"}`,
      );
      break;
    case "component":
      lines.push(
        `- **Variants:** ${metadata.variants.map(code).join(", ") || "(none)"}`,
        `- **Slots:** ${metadata.slots.map(code).join(", ") || "(none)"}`,
        `- **Properties:** ${metadata.properties.length > 0 ? metadata.properties.map((property) => `${code(property.name)}: ${inlineText(property.type)}${property.required ? " (required)" : ""}`).join("; ") : "(none)"}`,
      );
      break;
    case "token": {
      const modes = Object.entries(metadata.modes)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${code(name)}=${code(value)}`)
        .join(", ");
      lines.push(
        `- **Category:** ${metadata.category}`,
        `- **Value:** ${code(metadata.value)}`,
        `- **Modes:** ${modes || "(none)"}`,
      );
      break;
    }
    case "flow":
      lines.push(
        "- **Steps:**",
        ...metadata.steps.map(
          (step) =>
            `  - ${code(step.id)}${step.screen ? ` on ${code(step.screen)}` : ""}: ${inlineText(step.action)}${step.next ? ` → ${code(step.next)}` : ""}`,
        ),
      );
      break;
    case "state":
      lines.push(
        `- **Subject:** ${code(metadata.subject)}`,
        `- **State:** ${code(metadata.name)}`,
        `- **Conditions:** ${metadata.conditions.map(inlineText).join("; ") || "(none)"}`,
        `- **Changes:** ${metadata.changes.map(inlineText).join("; ")}`,
      );
      break;
    case "responsive":
      lines.push(
        `- **Subject:** ${code(metadata.subject)}`,
        "- **Rules:**",
        ...metadata.rules.map(
          (rule) =>
            `  - ${code(rule.name)} (${rule.minWidth}px${rule.maxWidth === undefined ? "+" : `–${rule.maxWidth}px`}): ${inlineText(rule.behavior)}`,
        ),
      );
      break;
  }
  return [...lines, ""];
}

function renderSpecifications(selection: ContextSelection): string[] {
  const lines = ["## Relevant Specifications", ""];
  if (selection.specs.length === 0) {
    return [...lines, "No relevant specifications were selected."];
  }
  for (const { specification } of selection.specs) {
    lines.push(
      `### [${specification.type}] ${inlineText(specification.name)} (${code(specification.id)})`,
      "",
      specification.description,
      "",
      `**Source:** ${inlineText(specification.source)}`,
      "",
      ...renderDesignMetadata(specification.design),
      ...renderRelationships(specification.relationships),
      specification.content,
      "",
    );
  }
  return lines.slice(0, -1);
}

function renderPacket(selection: ContextSelection): string {
  const packetId = `packet.${selection.work.item.id}`;
  return [
    "# AutoForge Build Packet",
    "",
    `- **Packet:** ${code(packetId)}`,
    `- **Selected source budget:** ${selection.budget.usedTokens}/${selection.budget.maxTokens} estimated tokens${selection.budget.exceeded ? " (mandatory work exceeds budget)" : ""}`,
    "",
    ...renderWork(selection),
    "",
    ...renderDoctrines(selection),
    "",
    ...renderDecisions(selection),
    "",
    ...renderSpecifications(selection),
  ].join("\n");
}

export class ContextPacketCompiler {
  private readonly estimator: ContextTokenEstimator;

  constructor(options: ContextPacketCompilerOptions = {}) {
    this.estimator = options.estimator ?? new CharacterTokenEstimator();
  }

  compile(value: ContextSelection): ContextPacket {
    const selection = contextSelectionSchema.parse(value);
    const content = renderPacket(selection);
    return contextPacketSchema.parse({
      id: `packet.${selection.work.item.id}`,
      workId: selection.work.item.id,
      format: "markdown",
      content,
      estimatedTokens: this.estimator.estimate(content),
      sourceTokens: selection.budget.usedTokens,
      maxSourceTokens: selection.budget.maxTokens,
      sourceBudgetExceeded: selection.budget.exceeded,
    });
  }
}

function includedLines(selection: ContextSelection): string[] {
  return [
    `- **Work:** ${code(selection.work.item.id)} — ${selection.work.reasons.join("; ")}`,
    ...selection.doctrines.map(
      (reference) =>
        `- **Doctrine ${code(reference.doctrine.id)}:** score ${reference.score}; ${reference.estimatedTokens} tokens; ${reference.reasons.join("; ")}`,
    ),
    ...selection.decisions.map(
      (reference) =>
        `- **Decision ${code(reference.decision.id)}:** score ${reference.score}; ${reference.estimatedTokens} tokens; ${reference.reasons.join("; ")}`,
    ),
    ...selection.specs.map(
      (reference) =>
        `- **Specification ${code(reference.specification.id)}:** score ${reference.score}; ${reference.estimatedTokens} tokens; ${reference.reasons.join("; ")}`,
    ),
  ];
}

export function formatContextExplanation(
  value: ContextSelection,
  packet: ContextPacket,
): string {
  const selection = contextSelectionSchema.parse(value);
  const validatedPacket = contextPacketSchema.parse(packet);
  const exclusionLines =
    selection.exclusions.length > 0
      ? selection.exclusions.map(
          (exclusion) =>
            `- **${exclusion.kind} ${code(exclusion.id)}:** ${exclusion.reason}${exclusion.estimatedTokens ? `; ${exclusion.estimatedTokens} tokens` : ""}; ${exclusion.details.join("; ")}`,
        )
      : ["- (none)"];
  return [
    "# Context Selection Explanation",
    "",
    "## Budget",
    "",
    `- **Maximum selected sources:** ${selection.budget.maxTokens} tokens`,
    `- **Selected sources:** ${selection.budget.usedTokens} tokens`,
    `- **Remaining:** ${selection.budget.remainingTokens} tokens`,
    `- **Mandatory source overrun:** ${selection.budget.exceeded ? "yes" : "no"}`,
    `- **Rendered packet estimate:** ${validatedPacket.estimatedTokens} tokens`,
    "",
    "## Included",
    "",
    ...includedLines(selection),
    "",
    "## Excluded",
    "",
    ...exclusionLines,
  ].join("\n");
}
