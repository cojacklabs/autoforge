import {
  INITIAL_DOCTRINE_NAMES,
  doctrineRegistrySchema,
  type DoctrineRegistry,
  type DoctrineRouting,
} from "./schemas.js";

interface BuiltinDoctrineDefinition {
  name: (typeof INITIAL_DOCTRINE_NAMES)[number];
  title: string;
  summary: string;
  content: string;
  routing: Partial<DoctrineRouting>;
}

const BUILTIN_DOCTRINES: readonly BuiltinDoctrineDefinition[] = [
  {
    name: "router",
    title: "Doctrine Router",
    summary: "Select only the behavior guidance relevant to current work.",
    content:
      "# Router\n\n- Load the smallest useful doctrine set.\n- Prefer explicit work, scope, and path signals.\n- Explain every selected doctrine.",
    routing: { keywords: ["context", "doctrine", "routing", "selection"] },
  },
  {
    name: "planning",
    title: "Planning",
    summary: "Decompose work into bounded, verifiable implementation steps.",
    content:
      "# Planning\n\n- Clarify the objective and acceptance criteria.\n- Sequence dependencies before implementation.\n- Keep each task narrow enough to review and test.",
    routing: {
      keywords: ["plan", "planning", "phase", "task"],
      workKinds: ["feature", "phase", "task"],
    },
  },
  {
    name: "decisions",
    title: "Decisions",
    summary: "Record durable choices with rationale and consequences.",
    content:
      "# Decisions\n\n- Record choices that constrain future work.\n- State reasoning and consequences explicitly.\n- Supersede obsolete guidance instead of deleting history.",
    routing: {
      keywords: ["decision", "rationale", "reasoning", "why"],
      scopeTags: ["decisions"],
    },
  },
  {
    name: "scope",
    title: "Scope Control",
    summary: "Keep implementation inside declared work boundaries.",
    content:
      "# Scope\n\n- Modify only files required by active work.\n- Treat excluded paths as hard boundaries.\n- Stop and report when necessary work exceeds scope.",
    routing: {
      keywords: ["boundary", "path", "scope"],
      workKinds: ["task", "issue"],
      scopeTags: ["scope"],
    },
  },
  {
    name: "questions",
    title: "Questions",
    summary: "Resolve material ambiguity without blocking routine progress.",
    content:
      "# Questions\n\n- Discover answers from local context first.\n- State safe assumptions when risk is low.\n- Ask concise questions when ambiguity could cause harmful rework.",
    routing: { keywords: ["ambiguity", "assumption", "clarify", "question"] },
  },
  {
    name: "testing",
    title: "Testing",
    summary: "Verify observable behavior with focused automated evidence.",
    content:
      "# Testing\n\n- Test behavior and failure paths, not implementation trivia.\n- Run focused tests before broader suites.\n- Do not hide unrelated failures.",
    routing: {
      keywords: ["quality", "regression", "test", "verification"],
      workKinds: ["task", "issue"],
      scopeTags: ["testing"],
      pathPatterns: ["test/**", "tests/**", "**/*.test.*", "**/*.spec.*"],
    },
  },
  {
    name: "frontend",
    title: "Frontend",
    summary: "Build accessible interfaces consistent with project patterns.",
    content:
      "# Frontend\n\n- Reuse established components and tokens.\n- Preserve responsive and accessible behavior.\n- Validate loading, empty, error, and interactive states.",
    routing: {
      keywords: ["component", "frontend", "interface", "ui"],
      scopeTags: ["frontend"],
      pathPatterns: ["src/components/**", "src/pages/**", "src/app/**"],
    },
  },
  {
    name: "backend",
    title: "Backend",
    summary: "Implement reliable server behavior with explicit boundaries.",
    content:
      "# Backend\n\n- Validate inputs at trust boundaries.\n- Keep domain logic independent from transport code.\n- Make failures explicit, typed, and observable.",
    routing: {
      keywords: ["api", "backend", "database", "server"],
      scopeTags: ["backend"],
      pathPatterns: ["src/api/**", "src/server/**", "src/routes/**"],
    },
  },
  {
    name: "design",
    title: "Design",
    summary: "Preserve visual hierarchy, consistency, and usability.",
    content:
      "# Design\n\n- Use the established design system before inventing values.\n- Preserve hierarchy, rhythm, and interaction clarity.\n- Treat accessibility as a design requirement.",
    routing: {
      keywords: ["design", "layout", "token", "typography"],
      scopeTags: ["design"],
      pathPatterns: ["src/styles/**", "src/design/**", "design/**"],
    },
  },
  {
    name: "security",
    title: "Security",
    summary: "Protect trust boundaries, credentials, and sensitive data.",
    content:
      "# Security\n\n- Validate untrusted input and enforce authorization server-side.\n- Never expose secrets in code, output, or logs.\n- Prefer least privilege and fail-closed behavior.",
    routing: {
      keywords: ["auth", "permission", "secret", "security"],
      scopeTags: ["security"],
      pathPatterns: ["src/auth/**", "src/security/**"],
    },
  },
  {
    name: "commenting",
    title: "Code Commentary",
    summary:
      "Preserve non-obvious intent with durable comments without creating noise.",
    content:
      "# Code Commentary\n\n- Explain why at public contracts, architectural boundaries, invariants, security or compatibility constraints, non-obvious algorithms, and intentional tradeoffs when types and tests are insufficient.\n- Do not restate syntax, preserve prompt transcripts, or leave stale narrative comments; prefer clear names, typed APIs, tests, and linked decisions.\n- Link TODO/FIXME follow-ups to an AutoForge task or issue when practical, and reject unactionable markers during review.",
    routing: {
      keywords: ["comment", "commentary", "documentation", "todo"],
      workKinds: ["task", "issue"],
      scopeTags: ["code-quality"],
      pathPatterns: ["src/**", "packages/**", "apps/**"],
    },
  },
];

export function createInitialDoctrineRegistry(
  timestamp: string,
): DoctrineRegistry {
  return doctrineRegistrySchema.parse({
    doctrines: BUILTIN_DOCTRINES.map((definition) => ({
      id: `doctrine.${definition.name}`,
      name: definition.name,
      title: definition.title,
      summary: definition.summary,
      content: definition.content,
      routing: {
        keywords: definition.routing.keywords ?? [],
        workKinds: definition.routing.workKinds ?? [],
        scopeTags: definition.routing.scopeTags ?? [],
        pathPatterns: definition.routing.pathPatterns ?? [],
      },
      source: "builtin",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  });
}
