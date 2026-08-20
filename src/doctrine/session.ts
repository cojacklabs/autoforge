import { z } from "zod";

import { AutoForgeError, EXIT_CODE } from "../core/errors.js";
import { resolveProjectPath } from "../core/paths.js";
import {
  createStateEnvelopeSchema,
  STATE_SCHEMA_VERSION,
  type StateEnvelope,
} from "../state/schemas.js";
import { AtomicStateStore } from "../state/store.js";
import type { WorkState } from "../work/schemas.js";
import { routeDoctrines } from "./router.js";
import type { DoctrineRegistry } from "./schemas.js";

const selectionReasonSchema = z
  .object({
    signal: z.enum([
      "router",
      "keyword",
      "work-kind",
      "scope-tag",
      "path-pattern",
    ]),
    value: z.string().min(1),
    weight: z.number().int().positive(),
  })
  .strict();

const selectedDoctrineSchema = z
  .object({
    doctrineId: z.string().regex(/^doctrine\.[a-z][a-z0-9-]*$/),
    score: z.number().int().positive(),
    reasons: z.array(selectionReasonSchema).min(1),
  })
  .strict();

export const doctrineSessionSchema = z
  .object({
    sessionId: z.string().regex(/^session\.[a-z0-9][a-z0-9._-]*$/),
    workKind: z.enum(["task", "issue"]),
    workId: z.string().min(1),
    selectedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }).nullable(),
    selections: z.array(selectedDoctrineSchema).min(1),
  })
  .strict()
  .superRefine((session, context) => {
    if (
      session.endedAt !== null &&
      Date.parse(session.endedAt) < Date.parse(session.selectedAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "A doctrine session cannot end before selection",
        path: ["endedAt"],
      });
    }
    const ids = session.selections.map((selection) => selection.doctrineId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Doctrine session selections must be unique",
        path: ["selections"],
      });
    }
  });

export const doctrineSessionStateSchema = z
  .object({
    current: doctrineSessionSchema.nullable(),
    previous: z.array(doctrineSessionSchema),
  })
  .strict()
  .superRefine((state, context) => {
    if (state.current !== null && state.current.endedAt !== null) {
      context.addIssue({
        code: "custom",
        message: "The current doctrine session cannot be ended",
        path: ["current", "endedAt"],
      });
    }
    if (state.previous.some((session) => session.endedAt === null)) {
      context.addIssue({
        code: "custom",
        message: "Previous doctrine sessions must be ended",
        path: ["previous"],
      });
    }
  });

export type DoctrineSession = z.infer<typeof doctrineSessionSchema>;
export type DoctrineSessionState = z.infer<typeof doctrineSessionStateSchema>;

export const doctrineSessionStateEnvelopeSchema = createStateEnvelopeSchema(
  doctrineSessionStateSchema,
).refine((envelope) => envelope.schemaVersion === STATE_SCHEMA_VERSION, {
  message: `Expected state schema version ${STATE_SCHEMA_VERSION}`,
  path: ["schemaVersion"],
});

export interface DoctrineSessionStoreOptions {
  now?: () => Date;
  temporaryId?: () => string;
  stateDirectory?: string;
}

export function createInitialDoctrineSessionState(): DoctrineSessionState {
  return { current: null, previous: [] };
}

export function parseDoctrineSessionStateEnvelope(
  value: unknown,
): StateEnvelope<DoctrineSessionState> {
  const result = doctrineSessionStateEnvelopeSchema.safeParse(value);
  if (!result.success) {
    throw new AutoForgeError(
      "INVALID_STATE",
      "Invalid doctrine session state",
      {
        details: { issues: result.error.issues },
        exitCode: EXIT_CODE.invalidState,
      },
    );
  }
  return result.data;
}

export function createDoctrineSessionStore(
  projectRoot: string,
  options: DoctrineSessionStoreOptions = {},
): AtomicStateStore<DoctrineSessionState> {
  const { stateDirectory = ".autoforge/state", ...storeOptions } = options;
  return new AtomicStateStore({
    filePath: resolveProjectPath(
      projectRoot,
      `${stateDirectory}/doctrine-session.json`,
    ),
    schema: doctrineSessionStateEnvelopeSchema,
    schemaVersion: STATE_SCHEMA_VERSION,
    ...storeOptions,
  });
}

export interface SelectDoctrineSessionInput {
  sessionId: string;
  workKind: "task" | "issue";
  workId: string;
  scopeTags?: readonly string[];
  paths?: readonly string[];
}

export interface DoctrineSessionServiceOptions {
  now?: () => Date;
}

export class DoctrineSessionService {
  constructor(
    private readonly store: AtomicStateStore<DoctrineSessionState>,
    private readonly registry: DoctrineRegistry,
    private readonly work: WorkState,
    private readonly options: DoctrineSessionServiceOptions = {},
  ) {}

  async select(input: SelectDoctrineSessionInput): Promise<DoctrineSession> {
    const { state } = await this.store.read();
    if (state.data.current !== null) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Doctrine session is already active: ${state.data.current.sessionId}`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
    const collection =
      input.workKind === "task" ? this.work.tasks : this.work.issues;
    const work = collection.find((candidate) => candidate.id === input.workId);
    if (!work) {
      throw new AutoForgeError(
        "INVALID_ARGUMENT",
        `Unknown ${input.workKind} ${input.workId}`,
        { exitCode: EXIT_CODE.notFound },
      );
    }
    const selectedAt = (this.options.now ?? (() => new Date()))().toISOString();
    const current = doctrineSessionSchema.parse({
      sessionId: input.sessionId,
      workKind: input.workKind,
      workId: input.workId,
      selectedAt,
      endedAt: null,
      selections: routeDoctrines(this.registry, {
        objective: `${work.name}\n${work.description}`,
        workKind: input.workKind,
        ...(input.scopeTags ? { scopeTags: input.scopeTags } : {}),
        ...(input.paths ? { paths: input.paths } : {}),
      }).map((selection) => ({
        doctrineId: selection.doctrine.id,
        score: selection.score,
        reasons: selection.reasons,
      })),
    });
    await this.store.write(
      { ...state.data, current },
      {
        expectedRevision: state.revision,
      },
    );
    return current;
  }

  async end(sessionId: string): Promise<DoctrineSession> {
    const { state } = await this.store.read();
    if (state.data.current?.sessionId !== sessionId) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Doctrine session is not active: ${sessionId}`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
    const ended = doctrineSessionSchema.parse({
      ...state.data.current,
      endedAt: (this.options.now ?? (() => new Date()))().toISOString(),
    });
    await this.store.write(
      { current: null, previous: [...state.data.previous, ended] },
      { expectedRevision: state.revision },
    );
    return ended;
  }

  async cancel(sessionId: string): Promise<void> {
    const { state } = await this.store.read();
    if (state.data.current?.sessionId !== sessionId) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Doctrine session is not active: ${sessionId}`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
    await this.store.write(
      { ...state.data, current: null },
      { expectedRevision: state.revision },
    );
  }

  async resume(sessionId: string): Promise<void> {
    const { state } = await this.store.read();
    if (state.data.current !== null) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Doctrine session is already active: ${state.data.current.sessionId}`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
    let index = -1;
    for (
      let candidate = state.data.previous.length - 1;
      candidate >= 0;
      candidate -= 1
    ) {
      if (state.data.previous[candidate]?.sessionId === sessionId) {
        index = candidate;
        break;
      }
    }
    if (index < 0) {
      throw new AutoForgeError(
        "STATE_CONFLICT",
        `Doctrine session cannot be resumed: ${sessionId}`,
        { exitCode: EXIT_CODE.conflict },
      );
    }
    const previous = [...state.data.previous];
    const ended = previous.splice(index, 1)[0]!;
    await this.store.write(
      { current: { ...ended, endedAt: null }, previous },
      { expectedRevision: state.revision },
    );
  }
}
