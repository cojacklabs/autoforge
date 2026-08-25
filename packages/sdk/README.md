# AutoForge SDK

`@cojacklabs/autoforge-sdk` is the programmatic facade between AutoForge
consumers and the deterministic Core and Protocol packages. The v0.25
foundation is private while its API is validated through the existing CLI.

The SDK returns protocol-versioned structured values. Project state effects are
provided through injected operations, so the SDK does not own terminal output,
filesystem layout, Git behavior, model providers, or hosted-service access.
