# AutoForge Protocol

`@cojacklabs/autoforge-protocol` contains the versioned, model-independent
contracts exchanged between AutoForge Core, agents, SDKs, and hosted clients.
It performs no filesystem, Git, network, credential, or provider I/O.

Wire versions are independent from the npm package version. Consumers should
negotiate `AUTOFORGE_PROTOCOL_VERSION` and capabilities before exchanging
protocol objects.

Protocol version `1` defines the provider-neutral cross-agent handoff contract.
It carries durable project continuity without transcript, message, credential,
provider-runtime, or machine-specific project-root fields.
