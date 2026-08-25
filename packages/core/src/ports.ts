export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface VersionedState<T> {
  revision: number;
  data: T;
}

export interface StateRepository<T> {
  read(): Promise<VersionedState<T>>;
  write(
    data: T,
    options?: { expectedRevision?: number },
  ): Promise<VersionedState<T>>;
}

export interface FileSystemPort {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  ensureDirectory(path: string): Promise<void>;
}

export interface GitPort {
  provisionWorktree(input: {
    projectRoot: string;
    workId: string;
    assignmentId: string;
  }): Promise<{ branch: string; path: string }>;
  removeWorktree?(projectRoot: string, worktreePath: string): Promise<void>;
}

export interface GlobalStoragePort {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
}

export const systemClock: Clock = { now: () => new Date() };
