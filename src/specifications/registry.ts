import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { SpecificationFileStore } from "./store.js";
import {
  specificationRelationshipEdgeSchema,
  specificationRelationshipNameSchema,
  specificationSchema,
  type Specification,
  type DesignMetadata,
  type KnowledgeMetadata,
  type SpecificationRelationshipEdge,
  type SpecificationRelationships,
  type SpecificationProvenance,
  type SpecificationType,
} from "./schemas.js";

export interface RegisterSpecificationInput {
  id: string;
  type: SpecificationType;
  name: string;
  description: string;
  relationships: SpecificationRelationships;
  tags: string[];
  source: string;
  content: string;
  design?: DesignMetadata;
  knowledge?: KnowledgeMetadata;
  provenance?: SpecificationProvenance | undefined;
}

export interface RegisterSpecificationResult {
  specification: Specification;
  path: string;
}

export interface ListSpecificationsOptions {
  types?: readonly SpecificationType[];
  tags?: readonly string[];
  source?: string;
}

export interface SearchSpecificationsOptions {
  query: string;
  types?: readonly SpecificationType[];
  tags?: readonly string[];
}

export interface RelationshipDiagnostic {
  sourceId: string;
  relationship: string;
  targetId: string;
  status: "missing-target";
}

export type RelationshipDirection = "outgoing" | "incoming" | "both";

export interface FindRelationshipsOptions {
  direction?: RelationshipDirection;
  relationships?: readonly string[];
}

export interface SpecificationRegistryOptions {
  now?: () => Date;
}

function invalidInput(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_ARGUMENT", message, {
    details,
    exitCode: EXIT_CODE.usage,
  });
}

export class SpecificationRegistry {
  private readonly store: SpecificationFileStore;
  private readonly now: () => Date;

  constructor(
    store: SpecificationFileStore,
    options: SpecificationRegistryOptions = {},
  ) {
    this.store = store;
    this.now = options.now ?? (() => new Date());
  }

  async register(
    input: RegisterSpecificationInput,
  ): Promise<RegisterSpecificationResult> {
    const result = specificationSchema.safeParse({
      ...input,
      updatedAt: this.now().toISOString(),
    });
    if (!result.success) {
      throw invalidInput("Invalid specification registration", {
        issues: result.error.issues,
      });
    }
    const path = await this.store.create(result.data);
    return { specification: result.data, path };
  }

  async update(
    input: RegisterSpecificationInput,
  ): Promise<RegisterSpecificationResult> {
    const result = specificationSchema.safeParse({
      ...input,
      updatedAt: this.now().toISOString(),
    });
    if (!result.success) {
      throw invalidInput("Invalid specification update", {
        issues: result.error.issues,
      });
    }
    const path = await this.store.update(result.data);
    return { specification: result.data, path };
  }

  read(id: string): Promise<Specification> {
    return this.store.read(id);
  }

  async list(
    options: ListSpecificationsOptions = {},
  ): Promise<Specification[]> {
    const typeFilter = options.types ? new Set(options.types) : undefined;
    const tagFilter = options.tags ? new Set(options.tags) : undefined;
    return (await this.store.list()).filter(
      (specification) =>
        (typeFilter === undefined || typeFilter.has(specification.type)) &&
        (tagFilter === undefined ||
          [...tagFilter].every((tag) => specification.tags.includes(tag))) &&
        (options.source === undefined ||
          specification.source === options.source),
    );
  }

  async search(options: SearchSpecificationsOptions): Promise<Specification[]> {
    const query = options.query.trim().toLocaleLowerCase();
    if (!query) return [];
    const typeFilter = options.types ? new Set(options.types) : undefined;
    const tagFilter = options.tags ? new Set(options.tags) : undefined;
    return (await this.store.list())
      .filter(
        (specification) =>
          (typeFilter === undefined || typeFilter.has(specification.type)) &&
          (tagFilter === undefined ||
            [...tagFilter].every((tag) => specification.tags.includes(tag))) &&
          [
            specification.id,
            specification.name,
            specification.description,
            specification.content,
            ...specification.tags,
          ].some((value) => value.toLocaleLowerCase().includes(query)),
      )
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async relationshipDiagnostics(): Promise<RelationshipDiagnostic[]> {
    const specifications = await this.store.list();
    const ids = new Set(
      specifications.map((specification) => specification.id),
    );
    return specifications
      .flatMap((specification) =>
        Object.entries(specification.relationships).flatMap(
          ([relationship, targets]) =>
            targets
              .filter((targetId) => !ids.has(targetId))
              .map((targetId) => ({
                sourceId: specification.id,
                relationship,
                targetId,
                status: "missing-target" as const,
              })),
        ),
      )
      .sort(
        (left, right) =>
          left.sourceId.localeCompare(right.sourceId) ||
          left.relationship.localeCompare(right.relationship) ||
          left.targetId.localeCompare(right.targetId),
      );
  }

  async findRelationships(
    id: string,
    options: FindRelationshipsOptions = {},
  ): Promise<SpecificationRelationshipEdge[]> {
    const anchor = await this.store.read(id);
    const direction = options.direction ?? "both";
    const relationshipFilter = options.relationships
      ? new Set(
          options.relationships.map((relationship) => {
            const result =
              specificationRelationshipNameSchema.safeParse(relationship);
            if (!result.success) {
              throw invalidInput("Invalid relationship filter", {
                relationship,
                issues: result.error.issues,
              });
            }
            return result.data;
          }),
        )
      : undefined;
    const specifications = await this.store.list();
    const edges: SpecificationRelationshipEdge[] = [];

    if (direction === "outgoing" || direction === "both") {
      for (const [relationship, targets] of Object.entries(
        anchor.relationships,
      )) {
        if (
          relationshipFilter !== undefined &&
          !relationshipFilter.has(relationship)
        ) {
          continue;
        }
        for (const targetId of targets) {
          edges.push(
            specificationRelationshipEdgeSchema.parse({
              sourceId: anchor.id,
              relationship,
              targetId,
            }),
          );
        }
      }
    }

    if (direction === "incoming" || direction === "both") {
      for (const specification of specifications) {
        if (specification.id === anchor.id) {
          continue;
        }
        for (const [relationship, targets] of Object.entries(
          specification.relationships,
        )) {
          if (
            !targets.includes(anchor.id) ||
            (relationshipFilter !== undefined &&
              !relationshipFilter.has(relationship))
          ) {
            continue;
          }
          edges.push(
            specificationRelationshipEdgeSchema.parse({
              sourceId: specification.id,
              relationship,
              targetId: anchor.id,
            }),
          );
        }
      }
    }

    return edges.sort(
      (left, right) =>
        left.sourceId.localeCompare(right.sourceId) ||
        left.relationship.localeCompare(right.relationship) ||
        left.targetId.localeCompare(right.targetId),
    );
  }
}
