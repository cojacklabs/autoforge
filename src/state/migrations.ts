import { AutoForgeError, EXIT_CODE } from "../core/errors.js";

export interface StateMigration {
  fromVersion: number;
  toVersion: number;
  migrate(value: Readonly<Record<string, unknown>>): unknown;
}

function invalidMigration(
  message: string,
  details: Readonly<Record<string, unknown>>,
): AutoForgeError {
  return new AutoForgeError("INVALID_STATE", message, {
    details,
    exitCode: EXIT_CODE.invalidState,
  });
}

function readSchemaVersion(value: unknown): number {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("schemaVersion" in value) ||
    !Number.isInteger(value.schemaVersion) ||
    Number(value.schemaVersion) < 1
  ) {
    throw invalidMigration("State has no valid schema version", {});
  }

  return Number(value.schemaVersion);
}

export class MigrationRegistry {
  private readonly migrations = new Map<number, StateMigration>();

  register(migration: StateMigration): void {
    if (
      !Number.isInteger(migration.fromVersion) ||
      migration.fromVersion < 1 ||
      !Number.isInteger(migration.toVersion)
    ) {
      throw invalidMigration("Migration versions must be positive integers", {
        fromVersion: migration.fromVersion,
        toVersion: migration.toVersion,
      });
    }

    if (migration.toVersion !== migration.fromVersion + 1) {
      throw invalidMigration("Migrations must advance exactly one version", {
        fromVersion: migration.fromVersion,
        toVersion: migration.toVersion,
      });
    }

    if (this.migrations.has(migration.fromVersion)) {
      throw invalidMigration(
        "A migration is already registered for this version",
        {
          fromVersion: migration.fromVersion,
        },
      );
    }

    this.migrations.set(migration.fromVersion, migration);
  }

  migrate(value: unknown, targetVersion: number): unknown {
    if (!Number.isInteger(targetVersion) || targetVersion < 1) {
      throw invalidMigration("Target version must be a positive integer", {
        targetVersion,
      });
    }

    let currentValue = value;
    let currentVersion = readSchemaVersion(currentValue);

    if (currentVersion > targetVersion) {
      throw invalidMigration(
        "State schema is newer than this AutoForge version",
        {
          currentVersion,
          targetVersion,
        },
      );
    }

    while (currentVersion < targetVersion) {
      const migration = this.migrations.get(currentVersion);
      if (!migration) {
        throw invalidMigration("No migration path is registered", {
          currentVersion,
          targetVersion,
        });
      }

      if (
        typeof currentValue !== "object" ||
        currentValue === null ||
        Array.isArray(currentValue)
      ) {
        throw invalidMigration("Migration input must be an object", {
          currentVersion,
        });
      }

      currentValue = migration.migrate(currentValue as Record<string, unknown>);
      const migratedVersion = readSchemaVersion(currentValue);
      if (migratedVersion !== migration.toVersion) {
        throw invalidMigration(
          "Migration produced an unexpected schema version",
          {
            fromVersion: migration.fromVersion,
            expectedVersion: migration.toVersion,
            actualVersion: migratedVersion,
          },
        );
      }

      currentVersion = migratedVersion;
    }

    return currentValue;
  }
}
