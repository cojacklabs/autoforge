# AutoForge SDK

`@cojacklabs/autoforge-sdk` is the supported programmatic facade between
AutoForge consumers and the deterministic Core and Protocol packages.

The SDK returns protocol-versioned structured values. Project state effects are
provided through injected operations, so the SDK does not own terminal output,
filesystem layout, Git behavior, model providers, or hosted-service access.

## Supported lifecycle

The SDK exposes protocol-wrapped operations for:

- project discovery and attachment;
- project status and intent assessment;
- work inspection, start, and completion;
- context compilation and guardrail checks;
- orchestration assignments;
- decisions and validation;
- provider-neutral handoff persistence.

The `handoffs` operation accepts the protocol's typed
`CreateAgentHandoffInput`; raw transcript and message fields are not part of
that input. Canonical local adapters persist validated handoffs beneath
`.autoforge/handoffs/`.

Every successful operation returns:

```ts
interface SdkResponse<T> {
  protocolVersion: "1";
  data: T;
}
```

Effects are injected when the SDK is created. This allows the local CLI,
third-party agents, and the first-party AutoForge Agent to use the same API
without giving the SDK ownership of project storage or terminal output.

```ts
import { createAutoForgeSdk } from "@cojacklabs/autoforge-sdk";

const sdk = createAutoForgeSdk({ operations });
const status = await sdk.status();
const context = await sdk.context({ explain: true });
```

`getSdkCapabilities()` returns the supported operation identifiers and wire
protocol version for capability negotiation. Adapter errors are intentionally
preserved so callers can handle the structured Core error contract.

## Compatibility

- SDK package: `@cojacklabs/autoforge-sdk` `0.1.x`
- Core package: `@cojacklabs/autoforge-core` `^0.1.0`
- Protocol package: `@cojacklabs/autoforge-protocol` `^0.1.0`
- Wire protocol: `1`, negotiated independently from npm package versions
- Node.js: 20 or newer

The package is release-ready but publication remains subject to an explicit
human release approval. Creating or packing the workspace is not publication.
