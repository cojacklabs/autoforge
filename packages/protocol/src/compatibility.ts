import { z } from "zod";

/**
 * Canonical framework identity constants for Priozar and compatibility aliases for AutoForge.
 * Replaces the superseded Forger proposal after the Forger identity gate failed.
 */

export const FRAMEWORK_IDENTITY = {
  current: {
    product: "AutoForge",
    displayName: "AutoForge",
    executable: "autoforge",
    npmScope: "@cojacklabs",
    cliPackage: "@cojacklabs/autoforge",
    corePackage: "@cojacklabs/autoforge-core",
    protocolPackage: "@cojacklabs/autoforge-protocol",
    sdkPackage: "@cojacklabs/autoforge-sdk",
    stateDirectory: ".autoforge",
    envPrefix: "AUTOFORGE_",
    credentialService: "com.cojacklabs.autoforge",
    githubRepo: "cojacklabs/autoforge",
    domain: "autoforge.sh",
  },
  successor: {
    product: "Priozar",
    displayName: "Priozar",
    executable: "priozar",
    npmScope: "@cojacklabs",
    cliPackage: "@cojacklabs/priozar",
    corePackage: "@cojacklabs/priozar-core",
    protocolPackage: "@cojacklabs/priozar-protocol",
    sdkPackage: "@cojacklabs/priozar-sdk",
    stateDirectory: ".priozar",
    envPrefix: "PRIOZAR_",
    credentialService: "com.cojacklabs.priozar",
    githubRepo: "cojacklabs/priozar",
    domain: "priozar.sh",
  },
} as const;

export const SUPPORTED_FRAMEWORK_EXECUTABLES = [
  FRAMEWORK_IDENTITY.current.executable,
  FRAMEWORK_IDENTITY.successor.executable,
] as const;

export const SUPPORTED_STATE_DIRECTORIES = [
  FRAMEWORK_IDENTITY.current.stateDirectory,
  FRAMEWORK_IDENTITY.successor.stateDirectory,
] as const;

export const frameworkExecutableSchema = z.enum(SUPPORTED_FRAMEWORK_EXECUTABLES);
export type FrameworkExecutable = z.infer<typeof frameworkExecutableSchema>;

export const stateDirectorySchema = z.enum(SUPPORTED_STATE_DIRECTORIES);
export type StateDirectory = z.infer<typeof stateDirectorySchema>;

export interface CompatibilityResolution {
  activeStateDirectory: StateDirectory;
  isSuccessor: boolean;
  requiresMigration: boolean;
}
