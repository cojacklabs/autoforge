import { z } from "zod";

export const INITIAL_DOCTRINE_NAMES = [
  "router",
  "planning",
  "decisions",
  "scope",
  "questions",
  "testing",
  "frontend",
  "backend",
  "design",
  "security",
] as const;

export const MAX_DOCTRINE_CONTENT_CHARACTERS = 6_000;

const timestampSchema = z.string().datetime({ offset: true });
const canonicalTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9._/-]*$/, "Expected a canonical lowercase tag");

function isRepositoryRelativePattern(value: string): boolean {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value)
  ) {
    return false;
  }
  return !value
    .replaceAll("\\", "/")
    .split("/")
    .some((segment) => segment === "..");
}

export const doctrineNameSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "Expected a canonical doctrine name")
  .max(80);

export const doctrineIdSchema = z
  .string()
  .regex(
    /^doctrine\.[a-z][a-z0-9-]*$/,
    "Expected a doctrine ID such as doctrine.testing",
  );

export const doctrineRoutingSchema = z
  .object({
    keywords: z.array(canonicalTagSchema),
    workKinds: z.array(z.enum(["feature", "phase", "task", "issue"])),
    scopeTags: z.array(canonicalTagSchema),
    pathPatterns: z.array(
      z.string().trim().min(1).max(300).refine(isRepositoryRelativePattern, {
        message: "Doctrine path patterns must be repository-relative",
      }),
    ),
  })
  .strict()
  .superRefine((routing, context) => {
    for (const [field, values] of Object.entries(routing)) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${field} values must be unique`,
          path: [field],
        });
      }
    }
  });

export const doctrineSchema = z
  .object({
    id: doctrineIdSchema,
    name: doctrineNameSchema,
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(500),
    content: z.string().trim().min(1).max(MAX_DOCTRINE_CONTENT_CHARACTERS),
    routing: doctrineRoutingSchema,
    source: z.enum(["builtin", "project"]),
    status: z.enum(["active", "disabled"]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((doctrine, context) => {
    if (doctrine.id !== `doctrine.${doctrine.name}`) {
      context.addIssue({
        code: "custom",
        message: "Doctrine ID must match its name",
        path: ["id"],
      });
    }
    if (Date.parse(doctrine.updatedAt) < Date.parse(doctrine.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "A doctrine cannot be updated before it is created",
        path: ["updatedAt"],
      });
    }
  });

export const doctrineRegistrySchema = z
  .object({
    doctrines: z.array(doctrineSchema),
  })
  .strict()
  .superRefine((registry, context) => {
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const [index, doctrine] of registry.doctrines.entries()) {
      if (ids.has(doctrine.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate doctrine ID: ${doctrine.id}`,
          path: ["doctrines", index, "id"],
        });
      }
      if (names.has(doctrine.name)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate doctrine name: ${doctrine.name}`,
          path: ["doctrines", index, "name"],
        });
      }
      ids.add(doctrine.id);
      names.add(doctrine.name);
    }
  });

export type DoctrineRouting = z.infer<typeof doctrineRoutingSchema>;
export type Doctrine = z.infer<typeof doctrineSchema>;
export type DoctrineRegistry = z.infer<typeof doctrineRegistrySchema>;
