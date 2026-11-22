import { z } from "zod";

export const PRIOZAR_PROTOCOL_VERSION = "1" as const;
/** @deprecated Use PRIOZAR_PROTOCOL_VERSION. */
export const AUTOFORGE_PROTOCOL_VERSION = PRIOZAR_PROTOCOL_VERSION;
export const SUPPORTED_PROTOCOL_VERSIONS = [PRIOZAR_PROTOCOL_VERSION] as const;

export const protocolVersionSchema = z.enum(SUPPORTED_PROTOCOL_VERSIONS);
export type ProtocolVersion = z.infer<typeof protocolVersionSchema>;

export class UnsupportedProtocolVersionError extends Error {
  readonly code = "UNSUPPORTED_PROTOCOL_VERSION" as const;
  readonly receivedVersion: string;
  readonly supportedVersions = SUPPORTED_PROTOCOL_VERSIONS;

  constructor(receivedVersion: string) {
    super(
      `Unsupported AutoForge protocol version ${receivedVersion}; supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")}`,
    );
    this.name = "UnsupportedProtocolVersionError";
    this.receivedVersion = receivedVersion;
  }
}

export function assertSupportedProtocolVersion(
  version: string,
): asserts version is ProtocolVersion {
  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(version as ProtocolVersion)) {
    throw new UnsupportedProtocolVersionError(version);
  }
}
