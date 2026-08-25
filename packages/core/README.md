# AutoForge Core

`@cojacklabs/autoforge-core` contains deterministic, model-independent project
intelligence and orchestration policy. External effects are supplied through
the interfaces exported from `@cojacklabs/autoforge-core/ports`.

Core never requires a model provider, hosted account, terminal, or network
service. The existing `autoforge` CLI supplies local adapters and remains the
compatibility entry point during the platform migration.

`AgentHandoffService` validates provider-neutral protocol handoffs and persists
them through an injected repository. Core owns handoff policy but not the
filesystem location or transport implementation.
